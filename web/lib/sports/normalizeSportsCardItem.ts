import type { SportsCardItem } from "@/lib/sports/types";

export type SportsHubOptionRow = {
  sports_event_id: string;
  sport_key: string | null;
  sport_name: string | null;
  competition_key: string | null;
  competition_name: string | null;
  competition_slug: string | null;
  event_label: string;
  start_time_utc: string;
  end_time_utc: string | null;
  status: string;
  season_label: string | null;
  round_label: string | null;
  event_type: string | null;
  home_competitor: string | null;
  away_competitor: string | null;
  venue_name: string | null;
  venue_city: string | null;
  venue_country: string | null;
  provider_name: string;
  provider_slug: string;
  provider_kind: string | null;
  logo_url: string | null;
  web_url: string | null;
  ios_url: string | null;
  android_url: string | null;
  market: string | null;
  language: string | null;
  availability_type: string | null;
  available_from_utc: string | null;
  available_until_utc: string | null;
  is_live: boolean | null;
  is_primary: boolean | null;
  availability_sort_order: number | null;
  primary_sort_order: number | null;
};

type NormalizedEventState = "LIVE" | "UPCOMING" | "COMPLETED";

function normalizeText(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function choosePrimaryProvider(rows: SportsHubOptionRow[]) {
  const sorted = [...rows].sort((a, b) => {
    const primaryDelta =
      Number(Boolean(b.is_primary)) - Number(Boolean(a.is_primary));
    if (primaryDelta !== 0) return primaryDelta;

    const liveDelta = Number(Boolean(b.is_live)) - Number(Boolean(a.is_live));
    if (liveDelta !== 0) return liveDelta;

    const availabilityDelta =
      (a.availability_sort_order ?? 999) - (b.availability_sort_order ?? 999);
    if (availabilityDelta !== 0) return availabilityDelta;

    return a.provider_name.localeCompare(b.provider_name);
  });

  return sorted[0] ?? null;
}

/**
 * Determines the canonical event state used by sports hub cards.
 *
 * HARD RULES:
 * 1. Explicit live signals win
 * 2. If event has not started yet, it is UPCOMING
 * 3. Otherwise it is COMPLETED
 *
 * NOTE:
 * This intentionally avoids ambiguous UI logic later.
 * One normalized state drives all watch capability flags.
 */
function normalizeEventState(rows: SportsHubOptionRow[]): NormalizedEventState {
  const first = rows[0];
  const nowMs = Date.now();

  const status = normalizeText(first?.status);
  const explicitLiveStatus =
    status === "live" ||
    status === "in_progress" ||
    status === "ongoing" ||
    status === "in progress";

  const hasLiveRowFlag = rows.some((row) => Boolean(row.is_live));

  const hasLiveAvailability = rows.some(
    (row) => normalizeText(row.availability_type) === "live_event"
  );

  if (explicitLiveStatus || hasLiveRowFlag || hasLiveAvailability) {
    return "LIVE";
  }

  const startMs = new Date(first.start_time_utc).getTime();
  if (startMs > nowMs) {
    return "UPCOMING";
  }

  return "COMPLETED";
}

/**
 * Filters rows down to the provider options relevant for the normalized event state.
 *
 * RULES:
 * - LIVE -> live_event only
 * - UPCOMING -> no active watch options yet
 * - COMPLETED -> replay/highlight only
 *
 * This prevents impossible provider/action combinations from leaking into UI.
 */
function filterRowsForEventState(
  rows: SportsHubOptionRow[],
  eventState: NormalizedEventState
) {
  if (eventState === "LIVE") {
    return rows.filter(
      (row) => normalizeText(row.availability_type) === "live_event"
    );
  }

  if (eventState === "COMPLETED") {
    return rows.filter((row) => {
      const value = normalizeText(row.availability_type);
      return value === "replay" || value === "highlight" || value === "highlights";
    });
  }

  return [];
}

export function normalizeSportsCardItem(
  rows: SportsHubOptionRow[]
): SportsCardItem | null {
  if (!rows.length) return null;

  const first = rows[0];
  const eventState = normalizeEventState(rows);
  const stateScopedRows = filterRowsForEventState(rows, eventState);
  const primary = choosePrimaryProvider(
    stateScopedRows.length ? stateScopedRows : rows
  );

  const hasLiveWatchOptions =
    eventState === "LIVE" &&
    stateScopedRows.some(
      (row) => normalizeText(row.availability_type) === "live_event"
    );

  const hasReplayOptions =
    eventState === "COMPLETED" &&
    stateScopedRows.some(
      (row) => normalizeText(row.availability_type) === "replay"
    );

  const hasHighlightOptions =
    eventState === "COMPLETED" &&
    stateScopedRows.some((row) => {
      const value = normalizeText(row.availability_type);
      return value === "highlight" || value === "highlights";
    });

  return {
    id: first.sports_event_id,
    href: `/sports/${first.sports_event_id}`,

    eventLabel: first.event_label,
    competitionName: first.competition_name ?? null,
    competitionSlug: first.competition_slug ?? null,
    sportKey: first.sport_key ?? null,

    seasonLabel: first.season_label ?? null,
    roundLabel: first.round_label ?? null,

    startTimeUtc: first.start_time_utc,
    endTimeUtc: first.end_time_utc ?? null,

    /**
     * IMPORTANT:
     * We now return the canonical normalized event state instead of leaking
     * inconsistent upstream/raw status values into the card layer.
     */
    status: eventState,

    homeCompetitor: first.home_competitor ?? null,
    awayCompetitor: first.away_competitor ?? null,

    venueName: first.venue_name ?? null,
    venueCity: first.venue_city ?? null,
    venueCountry: first.venue_country ?? null,

    primaryProviderName: primary?.provider_name ?? null,
    primaryProviderSlug: primary?.provider_slug ?? null,
    primaryProviderLogoUrl: primary?.logo_url ?? null,
    primaryProviderKind: primary?.provider_kind ?? null,

    hasLiveWatchOptions,
    hasReplayOptions,
    hasHighlightOptions,
  };
}