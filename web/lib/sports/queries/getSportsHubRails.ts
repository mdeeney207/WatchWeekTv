import { supabaseServer } from "@/lib/supabase-server";
import {
  normalizeSportsCardItem,
  type SportsHubOptionRow,
} from "@/lib/sports/normalizeSportsCardItem";
import type { SportsCardItem, SportsHubRails } from "@/lib/sports/types";

/**
 * Returns local start-of-day for the current server/runtime timezone.
 *
 * NOTE:
 * This is currently local-runtime based, not user-timezone based.
 * That is acceptable for the current server-driven Sports hub, but later
 * this should become timezone-aware if WatchWeek personalizes rails by user.
 */
function startOfTodayLocal() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Returns local end-of-day for a given date.
 *
 * Used to build "today" and weekly query windows.
 */
function endOfDayLocal(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999
  );
}

/**
 * Adds whole calendar days to a Date.
 *
 * NOTE:
 * This is good enough for current rail windowing.
 * If WatchWeek later needs strict timezone/calendar semantics per locale,
 * move date math into a shared utility layer.
 */
function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Determines whether an event should appear in the Live Now rail.
 *
 * RULES:
 * 1. Explicit live-like statuses win immediately
 * 2. Otherwise event must have already started
 * 3. If end time exists, current time must still be before end
 *
 * NOTE:
 * This remains intentionally a little permissive because feed quality varies.
 * The rail contract is still correct because live items are separated first.
 */
function isLiveNow(item: SportsCardItem, nowMs: number) {
  const startMs = new Date(item.startTimeUtc).getTime();
  const endMs = item.endTimeUtc ? new Date(item.endTimeUtc).getTime() : null;

  const status = String(item.status ?? "").trim().toLowerCase();
  if (status === "live" || status === "in_progress" || status === "ongoing") {
    return true;
  }

  if (startMs > nowMs) return false;
  if (endMs !== null && nowMs <= endMs) return true;

  return false;
}

/**
 * Determines whether an event belongs in the Starting Soon rail.
 *
 * STRICT WINDOW:
 * start_time > now
 * start_time <= now + 2 hours
 *
 * IMPORTANT:
 * Live events must never appear here.
 */
function isStartingSoon(item: SportsCardItem, nowMs: number) {
  const startMs = new Date(item.startTimeUtc).getTime();
  if (startMs <= nowMs) return false;

  const diffMs = startMs - nowMs;
  return diffMs <= 2 * 60 * 60 * 1000;
}

/**
 * Determines whether an event starts during the current local day window.
 *
 * NOTE:
 * This uses event start time only.
 */
function isToday(item: SportsCardItem, startMs: number, endMs: number) {
  const itemStart = new Date(item.startTimeUtc).getTime();
  return itemStart >= startMs && itemStart <= endMs;
}

/**
 * Removes duplicate event cards while preserving first-seen order.
 *
 * IMPORTANT:
 * We dedupe by event id after normalization because multiple provider rows
 * can map to the same underlying sports event.
 */
function dedupeById(items: SportsCardItem[]) {
  const map = new Map<string, SportsCardItem>();

  for (const item of items) {
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  }

  return Array.from(map.values());
}

/**
 * Sorts cards by event start time ascending.
 *
 * This keeps rail ordering predictable and schedule-like.
 */
function sortByStart(items: SportsCardItem[]) {
  return [...items].sort(
    (a, b) =>
      new Date(a.startTimeUtc).getTime() - new Date(b.startTimeUtc).getTime()
  );
}

/**
 * Groups raw watch-option rows by sports event id.
 *
 * SOURCE SHAPE:
 * v_sports_event_watch_options_v2 returns one row per event/provider/watch option,
 * so multiple rows often belong to the same event.
 *
 * We group first, then normalize one SportsCardItem per event.
 */
function groupRowsByEvent(rows: SportsHubOptionRow[]) {
  const grouped = new Map<string, SportsHubOptionRow[]>();

  for (const row of rows) {
    const existing = grouped.get(row.sports_event_id) ?? [];
    existing.push(row);
    grouped.set(row.sports_event_id, existing);
  }

  return grouped;
}

/**
 * Converts raw provider-option rows into deduped normalized card items.
 *
 * PIPELINE:
 * raw rows
 *   -> group by event
 *   -> normalizeSportsCardItem(eventRows)
 *   -> sort by start
 *   -> dedupe by id
 *
 * NOTE:
 * normalizeSportsCardItem is the real contract boundary between DB rows
 * and UI-facing SportsCardItem objects.
 */
function normalizeCards(rows: SportsHubOptionRow[]) {
  const grouped = groupRowsByEvent(rows);
  const cards: SportsCardItem[] = [];

  for (const eventRows of grouped.values()) {
    const card = normalizeSportsCardItem(eventRows);
    if (card) cards.push(card);
  }

  return dedupeById(sortByStart(cards));
}

/**
 * Builds non-overlapping rails from normalized sports cards.
 *
 * RAIL CONTRACT:
 * - liveNow: live only
 * - startingSoon: next 2 hours only, excluding live
 * - today: remainder of current local day, excluding live and startingSoon
 * - thisWeek: future days within 7-day hub window, excluding all above
 *
 * IMPORTANT:
 * Each event belongs to exactly one rail.
 */
function buildRails(cards: SportsCardItem[]): SportsHubRails {
  const nowMs = Date.now();
  const todayStart = startOfTodayLocal();
  const todayStartMs = todayStart.getTime();
  const todayEndMs = endOfDayLocal(todayStart).getTime();

  const liveNowIds = new Set<string>();
  const startingSoonIds = new Set<string>();
  const todayIds = new Set<string>();

  const liveNow = dedupeById(
    sortByStart(
      cards.filter((item) => {
        const live = isLiveNow(item, nowMs);
        if (live) liveNowIds.add(item.id);
        return live;
      })
    )
  );

  const startingSoon = dedupeById(
    sortByStart(
      cards.filter((item) => {
        if (liveNowIds.has(item.id)) return false;

        const soon = isStartingSoon(item, nowMs);
        if (soon) startingSoonIds.add(item.id);
        return soon;
      })
    )
  );

  const today = dedupeById(
    sortByStart(
      cards.filter((item) => {
        if (liveNowIds.has(item.id)) return false;
        if (startingSoonIds.has(item.id)) return false;

        const itemStartMs = new Date(item.startTimeUtc).getTime();
        if (itemStartMs <= nowMs) return false;

        const inToday = isToday(item, todayStartMs, todayEndMs);
        if (inToday) todayIds.add(item.id);
        return inToday;
      })
    )
  );

  const thisWeek = dedupeById(
    sortByStart(
      cards.filter((item) => {
        if (liveNowIds.has(item.id)) return false;
        if (startingSoonIds.has(item.id)) return false;
        if (todayIds.has(item.id)) return false;

        const itemStartMs = new Date(item.startTimeUtc).getTime();
        return itemStartMs > todayEndMs;
      })
    )
  );

  return {
    liveNow,
    startingSoon,
    today,
    thisWeek,
  };
}

/**
 * Loads and builds the normalized sports hub rails for /sports.
 *
 * PRIMARY WINDOW:
 * today -> end of local day + next 6 days
 * effectively a 7-day hub window
 *
 * RETURN CONTRACT:
 * {
 *   liveNow: SportsCardItem[],
 *   startingSoon: SportsCardItem[],
 *   today: SportsCardItem[],
 *   thisWeek: SportsCardItem[],
 * }
 *
 * IMPORTANT:
 * Rails are now strict and non-overlapping.
 */
export async function getSportsHubRails(): Promise<SportsHubRails> {
  const supabase = await supabaseServer();

  // Build the main 7-day server-side query window.
  const todayStart = startOfTodayLocal();
  const weekEnd = endOfDayLocal(addDays(todayStart, 6));

  /**
   * Main query:
   * fetch sports events + provider/watch metadata from the normalized view.
   *
   * NOTE:
   * We intentionally query the view, not raw tables, so the page depends on
   * one denormalized read model instead of duplicating join logic here.
   */
  const { data, error } = await supabase
    .from("v_sports_event_watch_options_v2")
    .select(
      `
        sports_event_id,
        sport_key,
        sport_name,
        competition_key,
        competition_name,
        competition_slug,
        event_label,
        start_time_utc,
        end_time_utc,
        status,
        season_label,
        round_label,
        event_type,
        home_competitor,
        away_competitor,
        venue_name,
        venue_city,
        venue_country,
        provider_name,
        provider_slug,
        provider_kind,
        logo_url,
        web_url,
        ios_url,
        android_url,
        market,
        language,
        availability_type,
        available_from_utc,
        available_until_utc,
        is_live,
        is_primary,
        availability_sort_order,
        primary_sort_order
      `
    )
    .gte("start_time_utc", todayStart.toISOString())
    .lte("start_time_utc", weekEnd.toISOString())
    .order("start_time_utc", { ascending: true })
    .order("is_primary", { ascending: false })
    .order("provider_name", { ascending: true });

  if (error) {
    throw new Error(`Failed to load sports hub rails: ${error.message}`);
  }

  const rows = (data ?? []) as SportsHubOptionRow[];

  // Normalize all event/provider rows into one UI card model per event.
  const cards = normalizeCards(rows);

  let rails = buildRails(cards);

  /**
   * Fallback behavior:
   * if the entire 7-day window comes back empty, query future events beyond
   * the weekly boundary so the Sports hub does not render as dead/empty.
   *
   * CURRENT FALLBACK:
   * - future events only
   * - capped to first 100 raw rows
   * - normalized and trimmed to 12 cards
   * - assigned to thisWeek only
   *
   * UI NOTE:
   * The page file may relabel this rail to "Coming Up" when it is the only
   * visible rail, which reads better than "This Week" for fallback content.
   */
  const allRailsEmpty =
    rails.liveNow.length === 0 &&
    rails.startingSoon.length === 0 &&
    rails.today.length === 0 &&
    rails.thisWeek.length === 0;

  if (allRailsEmpty) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("v_sports_event_watch_options_v2")
      .select(
        `
          sports_event_id,
          sport_key,
          sport_name,
          competition_key,
          competition_name,
          competition_slug,
          event_label,
          start_time_utc,
          end_time_utc,
          status,
          season_label,
          round_label,
          event_type,
          home_competitor,
          away_competitor,
          venue_name,
          venue_city,
          venue_country,
          provider_name,
          provider_slug,
          provider_kind,
          logo_url,
          web_url,
          ios_url,
          android_url,
          market,
          language,
          availability_type,
          available_from_utc,
          available_until_utc,
          is_live,
          is_primary,
          availability_sort_order,
          primary_sort_order
        `
      )
      .gt("start_time_utc", new Date().toISOString())
      .order("start_time_utc", { ascending: true })
      .order("is_primary", { ascending: false })
      .order("provider_name", { ascending: true })
      .limit(100);

    if (fallbackError) {
      throw new Error(
        `Failed to load fallback sports hub rails: ${fallbackError.message}`
      );
    }

    const fallbackRows = (fallbackData ?? []) as SportsHubOptionRow[];
    const fallbackCards = normalizeCards(fallbackRows).slice(0, 12);

    rails = {
      liveNow: [],
      startingSoon: [],
      today: [],
      thisWeek: fallbackCards,
    };
  }

  return rails;
}