import Link from "next/link";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

// ─── Types ────────────────────────────────────────────────────────────────────

type WorldCupRow = {
  sports_event_id: string;
  competition_id: string | null;
  event_label: string | null;
  stage: string | null;
  round_label: string | null;
  status: string | null;
  start_time_utc: string;
  end_time_utc: string | null;
  scheduled_local_date: string | null;
  scheduled_local_time: string | null;
  venue_name: string | null;
  venue_city: string | null;
  venue_region: string | null;
  venue_country: string | null;
  venue_timezone: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  home_team_name: string | null;
  away_team_name: string | null;
  display_home_team_name?: string | null;
  display_away_team_name?: string | null;
  home_team_short_name: string | null;
  away_team_short_name: string | null;
  home_competitor: string | null;
  away_competitor: string | null;
  home_score: number | null;
  away_score: number | null;
  score_json: unknown | null;
  provider_name?: string | null;
  provider_logo_url?: string | null;
  provider_web_url?: string | null;
};

type ReminderQueueRow = {
  sports_event_id: string | null;
  kind: string;
  send_at: string;
  status: string;
};

type ReminderOverrideRow = {
  sports_event_id: string;
  push_enabled: boolean;
};

type ReminderState = {
  enabled: boolean;
  has60m: boolean;
  has15m: boolean;
  pendingCount: number;
  suppressed: boolean;
};

type WorldCupMatch = WorldCupRow & {
  reminderState: ReminderState;
};

type SectionKey = "live-soon" | "today" | "tomorrow" | "this-week" | "coming-up";

type SectionItem = {
  title: string;
  key: SectionKey;
  data: WorldCupMatch[];
};

type UserTeamFollowRow = {
  id: string;
  user_id: string;
  competition_id: string | null;
  team_id: string;
  created_at: string;
  updated_at: string;
};

type ScreenMode = "all" | "my-teams";

// ─── Constants ─────────────────────────────────────────────────────────────────

const STARTING_SOON_WINDOW_HOURS = 2;
const DEFAULT_REMINDER_MINUTES = [60, 15];
const REMINDER_KINDS = ["sports_event_60m_push", "sports_event_15m_push"] as const;

const NO_FLAG_TEAM_KEYS = new Set([
  "tbd",
  "to be determined",
  "winner tbd",
  "team tbd",
  "unknown",
  "qualifier",
  "uefa playoff winner",
  "afc playoff winner",
  "inter confederation playoff winner",
  "inter-confederation playoff winner",
]);

const COUNTRY_FLAG_CODE_BY_TEAM_NAME: Record<string, string> = {
  argentina: "ar",
  australia: "au",
  austria: "at",
  belgium: "be",
  bolivia: "bo",
  bosniaandherzegovina: "ba",
  bosniaherzegovina: "ba",
  brazil: "br",
  bulgaria: "bg",
  cameroon: "cm",
  canada: "ca",
  chile: "cl",
  china: "cn",
  colombia: "co",
  costarica: "cr",
  croatia: "hr",
  czechrepublic: "cz",
  czechia: "cz",
  denmark: "dk",
  ecuador: "ec",
  egypt: "eg",
  finland: "fi",
  france: "fr",
  germany: "de",
  ghana: "gh",
  greece: "gr",
  honduras: "hn",
  hungary: "hu",
  iceland: "is",
  iran: "ir",
  iraq: "iq",
  ireland: "ie",
  israel: "il",
  italy: "it",
  ivorycoast: "ci",
  coteivoire: "ci",
  cotedivoire: "ci",
  jamaica: "jm",
  japan: "jp",
  jordan: "jo",
  southkorea: "kr",
  korearepublic: "kr",
  republicofkorea: "kr",
  korea: "kr",
  mexico: "mx",
  morocco: "ma",
  netherlands: "nl",
  newzealand: "nz",
  nigeria: "ng",
  norway: "no",
  panama: "pa",
  paraguay: "py",
  peru: "pe",
  poland: "pl",
  portugal: "pt",
  qatar: "qa",
  romania: "ro",
  saudiarabia: "sa",
  senegal: "sn",
  serbia: "rs",
  slovakia: "sk",
  slovenia: "si",
  southafrica: "za",
  spain: "es",
  sweden: "se",
  switzerland: "ch",
  tunisia: "tn",
  turkey: "tr",
  türkiye: "tr",
  turkiye: "tr",
  ukraine: "ua",
  unitedarabemirates: "ae",
  usa: "us",
  unitedstates: "us",
  unitedstatesofamerica: "us",
  uruguay: "uy",
  uzbekistan: "uz",
  venezuela: "ve",
};

export const metadata = {
  title: "World Cup 2026 | WatchWeek",
  description:
    "WatchWeek World Cup 2026 schedule with live windows, full match buckets, flags, venues, reminders, and watch links.",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function normalizeTeamFlagKey(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/[\s-]/g, "");
}

function isTeamFlagPlaceholder(value: string | null | undefined): boolean {
  const compact = (value || "").replace(/\s+/g, " ").trim().toLowerCase();
  if (!compact) return true;
  return NO_FLAG_TEAM_KEYS.has(compact);
}

function resolveTeamFlagCode(teamName: string | null | undefined): string | null {
  const compact = (teamName || "").replace(/\s+/g, " ").trim();
  if (!compact || isTeamFlagPlaceholder(compact)) return null;
  const key = normalizeTeamFlagKey(compact);
  return COUNTRY_FLAG_CODE_BY_TEAM_NAME[key] ?? null;
}

function getFlagUri(code: string): string {
  return `https://flagcdn.com/w40/${code.toLowerCase()}.png`;
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isWithinNextHours(date: Date, now: Date, hours: number): boolean {
  const diff = date.getTime() - now.getTime();
  return diff >= 0 && diff <= hours * 60 * 60 * 1000;
}

function toTitleish(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((part) => {
      if (!part) return part;
      const lower = part.toLowerCase();
      if (["uefa","afc","caf","concacaf","conmebol","ofc","fifa","tbd"].includes(lower)) {
        return lower.toUpperCase();
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

function normalizePlaceholderTeamLabel(rawValue: string | null | undefined): string | null {
  const value = (rawValue || "").trim();
  if (!value) return null;
  const compact = value.replace(/\s+/g, " ").trim();
  const lower = compact.toLowerCase();
  if (["tbd","to be determined","winner tbd","team tbd","unknown","qualifier"].includes(lower)) return "TBD";
  if (lower.includes("uefa") && lower.includes("playoff")) return "UEFA Playoff Winner";
  if (lower.includes("afc") && lower.includes("playoff")) return "AFC Playoff Winner";
  if ((lower.includes("inter") && lower.includes("confederation")) || lower.includes("inter-confederation")) return "Inter-Confederation Playoff Winner";
  if (lower.includes("playoff") && lower.includes("winner")) return toTitleish(compact);
  if (lower.includes("path") && lower.includes("winner")) return toTitleish(compact);
  if (lower.includes("runner-up")) return toTitleish(compact);
  if (lower.includes("winner") && lower.length <= 42) return toTitleish(compact);
  return null;
}

function getDisplayTeamName(
  preferred: string | null | undefined,
  fallback: string | null | undefined,
  hardFallback: string
): string {
  const preferredClean = preferred?.trim() || "";
  const fallbackClean = fallback?.trim() || "";
  if (preferredClean) return normalizePlaceholderTeamLabel(preferredClean) ?? preferredClean;
  if (fallbackClean) return normalizePlaceholderTeamLabel(fallbackClean) ?? fallbackClean;
  return hardFallback;
}

function getStatusCode(
  row: WorldCupRow
): "live" | "completed" | "postponed" | "cancelled" | "scheduled" | "startingSoon" | "upcoming" {
  const raw = (row.status || "").trim().toLowerCase();
  if (raw === "live" || raw === "in_progress" || raw === "in progress") return "live";
  if (raw === "final" || raw === "completed" || raw === "ended") return "completed";
  if (raw === "postponed") return "postponed";
  if (raw === "cancelled" || raw === "canceled") return "cancelled";
  const start = parseDate(row.start_time_utc);
  if (!start) return "scheduled";
  const now = new Date();
  if (isWithinNextHours(start, now, STARTING_SOON_WINDOW_HOURS)) return "startingSoon";
  if (start < now) return "scheduled";
  return "upcoming";
}

function getStatusLabel(row: WorldCupRow): string {
  const code = getStatusCode(row);
  switch (code) {
    case "live": return "Live";
    case "completed": return "Final";
    case "postponed": return "Postponed";
    case "cancelled": return "Cancelled";
    case "startingSoon": return "Starting Soon";
    case "upcoming": return "Upcoming";
    default: return "Scheduled";
  }
}

function translateStage(stage: string | null | undefined): string {
  const value = (stage || "").trim().toLowerCase();
  switch (value) {
    case "group stage": return "Group Stage";
    case "round of 32": return "Round of 32";
    case "round of 16": return "Round of 16";
    case "quarter-finals":
    case "quarterfinals":
    case "quarter finals": return "Quarter-finals";
    case "semi-finals":
    case "semifinals":
    case "semi finals": return "Semi-finals";
    case "third place":
    case "third-place": return "Third Place";
    case "final": return "Final";
    default: return stage?.trim() || "Match";
  }
}

function formatHeaderDate(date: Date, locale = "en-US"): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  }).format(date);
}

function formatKickoffTime(date: Date, locale = "en-US"): string {
  return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(date);
}

function formatKickoffDay(date: Date, locale = "en-US"): string {
  return new Intl.DateTimeFormat(locale, { weekday: "short", month: "short", day: "numeric" }).format(date);
}

function formatVenue(row: WorldCupRow): string {
  const venueName = row.venue_name?.trim() || null;
  const venueCity = row.venue_city?.trim() || null;
  if (venueName && venueCity) return `${venueName} · ${venueCity}`;
  if (venueName) return venueName;
  if (venueCity) return venueCity;
  return "Venue TBD";
}

function formatVenueTimezone(timeZone: string | null | undefined, eventDate: Date | null): string | null {
  if (!timeZone) return null;
  const safeDate = eventDate ?? new Date();
  try {
    const parts = new Intl.DateTimeFormat(undefined, { timeZone, timeZoneName: "short" }).formatToParts(safeDate);
    const zonePart = parts.find((part) => part.type === "timeZoneName")?.value?.trim();
    if (zonePart) return zonePart;
  } catch {}
  const lastSegment = timeZone.split("/").pop()?.replace(/_/g, " ").trim();
  return lastSegment || null;
}

function emptyReminderState(): ReminderState {
  return { enabled: false, has60m: false, has15m: false, pendingCount: 0, suppressed: false };
}

function buildReminderMap(
  queueRows: ReminderQueueRow[],
  overrideRows: ReminderOverrideRow[]
): Map<string, ReminderState> {
  const map = new Map<string, ReminderState>();
  for (const row of queueRows) {
    if (!row.sports_event_id) continue;
    const current = map.get(row.sports_event_id) ?? emptyReminderState();
    if (row.kind === "sports_event_60m_push") current.has60m = true;
    if (row.kind === "sports_event_15m_push") current.has15m = true;
    if (row.status === "pending") current.pendingCount += 1;
    current.enabled = current.pendingCount > 0 && !current.suppressed;
    map.set(row.sports_event_id, current);
  }
  for (const row of overrideRows) {
    const current = map.get(row.sports_event_id) ?? emptyReminderState();
    if (row.push_enabled === false) {
      current.suppressed = true;
      current.enabled = false;
      current.has60m = false;
      current.has15m = false;
      current.pendingCount = 0;
    }
    map.set(row.sports_event_id, current);
  }
  return map;
}

function getReminderLabel(reminder: ReminderState): string {
  if (reminder.suppressed) return "Reminders Off";
  if (!reminder.enabled) return "Set Reminder";
  if (reminder.has60m && reminder.has15m) return "Reminders On";
  if (reminder.pendingCount > 1) return `${reminder.pendingCount} Reminders`;
  if (reminder.pendingCount === 1) return "1 Reminder";
  return "Reminder Set";
}

function getStartingSoonRows(rows: WorldCupMatch[], now: Date): WorldCupMatch[] {
  return rows.filter((row) => {
    const kickoff = parseDate(row.start_time_utc);
    if (!kickoff) return false;
    const statusCode = getStatusCode(row);
    return statusCode === "live" || isWithinNextHours(kickoff, now, STARTING_SOON_WINDOW_HOURS);
  });
}

function getTodayRows(rows: WorldCupMatch[], now: Date): WorldCupMatch[] {
  return rows.filter((row) => {
    const start = parseDate(row.start_time_utc);
    return !!start && isSameLocalDay(start, now);
  });
}

function getTomorrowRows(rows: WorldCupMatch[], now: Date): WorldCupMatch[] {
  const tomorrow = addDays(startOfLocalDay(now), 1);
  return rows.filter((row) => {
    const start = parseDate(row.start_time_utc);
    return !!start && isSameLocalDay(start, tomorrow);
  });
}

function getThisWeekRows(rows: WorldCupMatch[], now: Date): WorldCupMatch[] {
  const start = addDays(startOfLocalDay(now), 2);
  const end = addDays(startOfLocalDay(now), 7);
  return rows.filter((row) => {
    const kickoff = parseDate(row.start_time_utc);
    if (!kickoff) return false;
    return kickoff >= start && kickoff < end;
  });
}

function getComingUpRows(rows: WorldCupMatch[], now: Date): WorldCupMatch[] {
  const start = addDays(startOfLocalDay(now), 7);
  return rows.filter((row) => {
    const kickoff = parseDate(row.start_time_utc);
    if (!kickoff) return false;
    return kickoff >= start;
  });
}

function buildSections(rows: WorldCupMatch[]): SectionItem[] {
  const now = new Date();
  const used = new Set<string>();
  const claimRows = (items: WorldCupMatch[]) => {
    const claimed = items.filter((item) => !used.has(item.sports_event_id));
    claimed.forEach((item) => used.add(item.sports_event_id));
    return claimed;
  };
  const sections: SectionItem[] = [];
  const buckets: Array<{ key: SectionKey; title: string; data: WorldCupMatch[] }> = [
    { key: "live-soon", title: "Live & Starting Soon", data: claimRows(getStartingSoonRows(rows, now)) },
    { key: "today", title: "Today", data: claimRows(getTodayRows(rows, now).filter((row) => { const code = getStatusCode(row); return code !== "live" && code !== "startingSoon"; })) },
    { key: "tomorrow", title: "Tomorrow", data: claimRows(getTomorrowRows(rows, now)) },
    { key: "this-week", title: "Later This Week", data: claimRows(getThisWeekRows(rows, now)) },
    { key: "coming-up", title: "Coming Up", data: claimRows(getComingUpRows(rows, now)) },
  ];
  for (const bucket of buckets) {
    if (!bucket.data.length) continue;
    sections.push({ title: bucket.title, key: bucket.key, data: bucket.data });
  }
  return sections;
}

function getNextKickoff(rows: WorldCupMatch[]): Date | null {
  const now = new Date();
  for (const row of rows) {
    const kickoff = parseDate(row.start_time_utc);
    if (kickoff && kickoff >= now) return kickoff;
  }
  return null;
}

function formatCountdown(target: Date | null): string {
  if (!target) return "In progress";
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) return "Now";
  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function getTeamFollowState(row: WorldCupMatch, followedTeamIds: Set<string>) {
  const isHomeFollowed = !!row.home_team_id && followedTeamIds.has(row.home_team_id);
  const isAwayFollowed = !!row.away_team_id && followedTeamIds.has(row.away_team_id);
  return { isFollowed: isHomeFollowed || isAwayFollowed, isHomeFollowed, isAwayFollowed };
}

function filterRowsForMyTeams(rows: WorldCupMatch[], followedTeamIds: Set<string>): WorldCupMatch[] {
  if (followedTeamIds.size === 0) return [];
  return rows.filter((row) => {
    const homeMatch = !!row.home_team_id && followedTeamIds.has(row.home_team_id);
    const awayMatch = !!row.away_team_id && followedTeamIds.has(row.away_team_id);
    return homeMatch || awayMatch;
  });
}

// ─── Supabase ─────────────────────────────────────────────────────────────────

async function getSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) throw new Error("Missing Supabase env vars");
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) {
        try {
          const mutableCookieStore = cookieStore as unknown as { set: (name: string, value: string, options?: CookieOptions) => void };
          cookiesToSet.forEach(({ name, value, options }) => { mutableCookieStore.set(name, value, options); });
        } catch {}
      },
    },
  });
}

async function loadWorldCupData() {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? null;

    const [
      { data: matchData, error: matchError },
      reminderResult,
      overrideResult,
      teamFollowResult,
    ] = await Promise.all([
      supabase.from("v_world_cup_2026_cards").select(`
        sports_event_id, competition_id, event_label, stage, round_label, status,
        start_time_utc, end_time_utc, scheduled_local_date, scheduled_local_time,
        venue_name, venue_city, venue_region, venue_country, venue_timezone,
        home_team_id, away_team_id, home_team_name, away_team_name,
        display_home_team_name, display_away_team_name,
        home_team_short_name, away_team_short_name,
        home_competitor, away_competitor, home_score, away_score, score_json,
        provider_name, provider_logo_url, provider_web_url
      `).order("start_time_utc", { ascending: true }),
      userId
        ? supabase.from("notification_queue").select("sports_event_id, kind, send_at, status")
            .eq("user_id", userId).eq("channel", "push").eq("status", "pending")
            .in("kind", [...REMINDER_KINDS]).not("sports_event_id", "is", null)
            .gte("send_at", new Date().toISOString())
        : Promise.resolve({ data: [] as ReminderQueueRow[], error: null }),
      userId
        ? supabase.from("user_sports_notification_overrides").select("sports_event_id, push_enabled").eq("user_id", userId)
        : Promise.resolve({ data: [] as ReminderOverrideRow[], error: null }),
      userId
        ? supabase.from("user_team_follows").select("id, user_id, competition_id, team_id, created_at, updated_at").eq("user_id", userId)
        : Promise.resolve({ data: [] as UserTeamFollowRow[], error: null }),
    ]);

    if (matchError) throw matchError;
    if (reminderResult.error) throw reminderResult.error;
    if (overrideResult.error) throw overrideResult.error;
    if (teamFollowResult.error) throw teamFollowResult.error;

    const reminderMap = buildReminderMap(
      (reminderResult.data as ReminderQueueRow[]) ?? [],
      (overrideResult.data as ReminderOverrideRow[]) ?? []
    );

    const rows: WorldCupMatch[] = ((matchData as WorldCupRow[]) ?? []).map((row) => ({
      ...row,
      reminderState: reminderMap.get(row.sports_event_id) ?? emptyReminderState(),
    }));

    const followedTeamIds = new Set(
      (((teamFollowResult.data as UserTeamFollowRow[]) ?? [])
        .map((row) => row.team_id?.trim())
        .filter((value): value is string => !!value))
    );

    return { rows, userId, followedTeamIds, errorText: null as string | null };
  } catch (error) {
    return {
      rows: [] as WorldCupMatch[],
      userId: null as string | null,
      followedTeamIds: new Set<string>(),
      errorText: error instanceof Error ? error.message : "Failed to load World Cup schedule.",
    };
  }
}

// ─── UI Components ────────────────────────────────────────────────────────────

function StatusPill({ row }: { row: WorldCupMatch }) {
  const code = getStatusCode(row);
  const isLive = code === "live";
  const isSoon = code === "startingSoon" || code === "postponed";
  const isDone = code === "completed";

  const style = isLive
    ? { background: "rgba(52,211,153,0.16)", border: "1px solid rgba(52,211,153,0.40)", color: "#6ee7b7" }
    : isSoon
    ? { background: "rgba(251,191,36,0.16)", border: "1px solid rgba(251,191,36,0.38)", color: "#fcd34d" }
    : isDone
    ? { background: "rgba(148,163,184,0.10)", border: "1px solid rgba(148,163,184,0.20)", color: "rgba(255,255,255,0.58)" }
    : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.58)" };

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]"
      style={style}
    >
      {isLive && (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 6px rgba(52,211,153,1)" }} />
        </span>
      )}
      {getStatusLabel(row)}
    </span>
  );
}

function MetricCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  tone?: "neutral" | "accent" | "live";
}) {
  const isLive = tone === "live" && Number(value) > 0;
  const isAccent = tone === "accent";

  return (
    <div
      className="relative overflow-hidden rounded-[18px] px-4 py-4"
      style={{
        background: isLive
          ? "linear-gradient(145deg, rgba(52,211,153,0.12) 0%, rgba(52,211,153,0.05) 100%)"
          : isAccent
          ? "linear-gradient(145deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)"
          : "linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
        border: isLive
          ? "1px solid rgba(52,211,153,0.30)"
          : "1px solid rgba(255,255,255,0.12)",
        boxShadow: isLive
          ? "0 0 32px -8px rgba(52,211,153,0.20)"
          : "0 8px 24px -12px rgba(0,0,0,0.60)",
      }}
    >
      {/* Specular top edge */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background: isLive
            ? "linear-gradient(90deg, transparent, rgba(52,211,153,0.60) 50%, transparent)"
            : "linear-gradient(90deg, transparent, rgba(255,255,255,0.22) 50%, transparent)",
        }}
      />
      <div
        className="text-[10px] font-black uppercase tracking-[0.28em]"
        style={{ color: isLive ? "rgba(52,211,153,0.80)" : "rgba(255,255,255,0.44)" }}
      >
        {label}
      </div>
      <div
        className="mt-1.5 font-black tabular-nums leading-none tracking-[-0.04em]"
        style={{
          fontSize: "clamp(26px, 2.4vw, 32px)",
          color: isLive ? "#6ee7b7" : "#ffffff",
          textShadow: isLive ? "0 0 32px rgba(52,211,153,0.40)" : "none",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function TeamFlag({ teamName }: { teamName: string }) {
  const code = resolveTeamFlagCode(teamName);

  if (!code) {
    return (
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[10px] font-black uppercase"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px dashed rgba(255,255,255,0.16)",
          color: "rgba(255,255,255,0.36)",
        }}
      >
        —
      </div>
    );
  }

  return (
    <div
      className="h-9 w-9 shrink-0 overflow-hidden rounded-full"
      style={{
        border: "1px solid rgba(255,255,255,0.18)",
        boxShadow: "0 2px 8px -2px rgba(0,0,0,0.60)",
      }}
    >
      <img
        src={getFlagUri(code)}
        alt=""
        className="h-full w-full object-cover"
        loading="lazy"
      />
    </div>
  );
}

function TeamRow({
  name,
  score,
  isFollowed,
  isLive,
  side = "left",
}: {
  name: string;
  score: number | null;
  isFollowed: boolean;
  isLive?: boolean;
  side?: "left" | "right";
}) {
  const isRight = side === "right";

  return (
    <div className={cn("flex items-center gap-3", isRight && "flex-row-reverse")}>
      <TeamFlag teamName={name} />

      <div className="min-w-0 flex-1">
        <div
          className={cn("truncate text-[15px] font-black leading-tight text-white", isRight && "text-right")}
          style={{ letterSpacing: "-0.025em" }}
        >
          {name}
        </div>
        {isFollowed ? (
          <div
            className={cn("mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em]", isRight && "float-right")}
            style={{
              background: "rgba(52,211,153,0.14)",
              border: "1px solid rgba(52,211,153,0.32)",
              color: "#6ee7b7",
            }}
          >
            Following
          </div>
        ) : null}
      </div>

      <div
        className="shrink-0 text-[26px] font-black tabular-nums leading-none tracking-[-0.04em]"
        style={{
          color: isLive ? "#6ee7b7" : "rgba(255,255,255,0.92)",
          textShadow: isLive ? "0 0 24px rgba(52,211,153,0.40)" : "none",
          minWidth: "28px",
          textAlign: "center",
        }}
      >
        {score ?? "—"}
      </div>
    </div>
  );
}

function MatchScoreBox({ row }: { row: WorldCupMatch }) {
  const isLive = getStatusCode(row) === "live";
  const home = getDisplayTeamName(row.display_home_team_name ?? row.home_team_name, row.home_competitor, "Home");
  const away = getDisplayTeamName(row.display_away_team_name ?? row.away_team_name, row.away_competitor, "Away");

  return (
    <div
      className="rounded-[16px] p-4"
      style={{
        background: "rgba(0,0,0,0.32)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="space-y-4">
        <TeamRow name={home} score={row.home_score} isFollowed={false} isLive={isLive} />
        <div style={{ height: "1px", background: "rgba(255,255,255,0.07)" }} />
        <TeamRow name={away} score={row.away_score} isFollowed={false} isLive={isLive} side="right" />
      </div>
    </div>
  );
}

function FeaturedMatchCard({
  row,
  detailHref,
}: {
  row: WorldCupMatch;
  detailHref: string;
}) {
  const kickoff = parseDate(row.start_time_utc);
  const code = getStatusCode(row);
  const isLive = code === "live";
  const home = getDisplayTeamName(row.display_home_team_name ?? row.home_team_name, row.home_competitor, "Home");
  const away = getDisplayTeamName(row.display_away_team_name ?? row.away_team_name, row.away_competitor, "Away");

  return (
    <div
      className="relative overflow-hidden rounded-[24px]"
      style={{
        background: "linear-gradient(145deg, rgba(28,28,28,0.98) 0%, rgba(16,16,16,0.98) 100%)",
        border: "1px solid rgba(255,255,255,0.38)",
        boxShadow: "0 32px 80px -32px rgba(0,0,0,0.98), inset 0 1px 0 rgba(255,255,255,0.07)",
      }}
    >
      {/* Specular top */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background: isLive
            ? "linear-gradient(90deg, transparent, rgba(52,211,153,0.70) 30%, rgba(52,211,153,0.70) 70%, transparent)"
            : "linear-gradient(90deg, transparent, rgba(255,255,255,0.52) 30%, rgba(255,255,255,0.52) 70%, transparent)",
        }}
      />
      {/* Left accent bar */}
      {isLive && (
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-[3px] rounded-l-[24px]"
          style={{
            background: "linear-gradient(to bottom, rgba(52,211,153,0.80), rgba(52,211,153,0.20) 60%, transparent)",
          }}
        />
      )}

      <div className="p-5">
        <div
          className="text-[9px] font-black uppercase tracking-[0.38em]"
          style={{ color: "rgba(255,255,255,0.40)" }}
        >
          Featured Match
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <StatusPill row={row} />
          <span
            className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em]"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.60)",
            }}
          >
            {translateStage(row.stage)}
          </span>
          {row.round_label ? (
            <span
              className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em]"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.60)",
              }}
            >
              {row.round_label}
            </span>
          ) : null}
        </div>

        <div className="mt-4">
          <MatchScoreBox row={row} />
        </div>

        <div className="mt-4 space-y-1.5">
          <div className="text-[13px] font-semibold" style={{ color: "rgba(255,255,255,0.72)" }}>
            {kickoff ? `${formatKickoffDay(kickoff)} · ${formatKickoffTime(kickoff)}` : "Kickoff TBD"}
          </div>
          <div className="text-[12px]" style={{ color: "rgba(255,255,255,0.52)" }}>
            {formatVenue(row)}
          </div>
          {row.provider_name ? (
            <div className="text-[12px]" style={{ color: "rgba(255,255,255,0.44)" }}>
              Watch on {row.provider_name}
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap gap-2.5">
          <Link
            href={row.provider_web_url?.trim() || detailHref}
            target={row.provider_web_url?.trim() ? "_blank" : undefined}
            rel={row.provider_web_url?.trim() ? "noreferrer" : undefined}
            className="inline-flex h-10 items-center justify-center rounded-[13px] px-5 text-[13px] font-black text-black transition-all hover:scale-[1.02] active:scale-[0.97]"
            style={{
              background: isLive
                ? "linear-gradient(180deg, #6ee7b7 0%, #34d399 100%)"
                : "linear-gradient(180deg, #ffffff 0%, #d8d8d8 100%)",
              boxShadow: isLive
                ? "0 8px 28px -10px rgba(52,211,153,0.60)"
                : "0 8px 24px -10px rgba(255,255,255,0.44)",
            }}
          >
            {isLive ? "Watch Live" : row.provider_name ? `Watch on ${row.provider_name}` : "Watch"}
          </Link>
          <Link
            href={detailHref}
            className="inline-flex h-10 items-center justify-center rounded-[13px] px-5 text-[13px] font-semibold transition-all hover:bg-white/[0.08]"
            style={{
              color: "rgba(255,255,255,0.88)",
              border: "1px solid rgba(255,255,255,0.28)",
              background: "rgba(255,255,255,0.07)",
            }}
          >
            {getReminderLabel(row.reminderState)}
          </Link>
        </div>
      </div>
    </div>
  );
}

function MatchCard({
  row,
  followedTeamIds,
}: {
  row: WorldCupMatch;
  followedTeamIds: Set<string>;
}) {
  const kickoff = parseDate(row.start_time_utc);
  const timezoneLabel = formatVenueTimezone(row.venue_timezone, kickoff);
  const followState = getTeamFollowState(row, followedTeamIds);
  const code = getStatusCode(row);
  const isLive = code === "live";

  const home = getDisplayTeamName(row.display_home_team_name ?? row.home_team_name, row.home_competitor, "Home");
  const away = getDisplayTeamName(row.display_away_team_name ?? row.away_team_name, row.away_competitor, "Away");

  const detailHref = `/sports/${row.sports_event_id}`;
  const watchHref = row.provider_web_url?.trim() || detailHref;

  return (
    <article
      className="group relative overflow-hidden rounded-[22px] p-5 transition-all duration-300 hover:-translate-y-1"
      style={{
        background: followState.isFollowed
          ? "linear-gradient(145deg, rgba(52,211,153,0.10) 0%, rgba(16,16,16,0.98) 100%)"
          : "linear-gradient(145deg, rgba(28,28,28,0.98) 0%, rgba(16,16,16,0.98) 100%)",
        border: followState.isFollowed
          ? "1px solid rgba(52,211,153,0.28)"
          : "1px solid rgba(255,255,255,0.18)",
        boxShadow: "0 20px 48px -20px rgba(0,0,0,0.92)",
      }}
    >
      {/* Specular top edge */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background: followState.isFollowed
            ? "linear-gradient(90deg, transparent, rgba(52,211,153,0.55) 30%, rgba(52,211,153,0.55) 70%, transparent)"
            : isLive
            ? "linear-gradient(90deg, transparent, rgba(52,211,153,0.55) 30%, rgba(52,211,153,0.55) 70%, transparent)"
            : "linear-gradient(90deg, transparent, rgba(255,255,255,0.38) 30%, rgba(255,255,255,0.38) 70%, transparent)",
        }}
      />
      {/* Live left bar */}
      {isLive && (
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-[3px] rounded-l-[22px]"
          style={{
            background: "linear-gradient(to bottom, rgba(52,211,153,0.80), rgba(52,211,153,0.20) 60%, transparent)",
          }}
        />
      )}
      {/* Hover glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-400 group-hover:opacity-100"
        style={{
          background: "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.03) 0%, transparent 60%)",
        }}
      />

      {/* Header row */}
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusPill row={row} />
          <span
            className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em]"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "rgba(255,255,255,0.56)",
            }}
          >
            {translateStage(row.stage)}
          </span>
          {row.round_label ? (
            <span
              className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em]"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.10)",
                color: "rgba(255,255,255,0.56)",
              }}
            >
              {row.round_label}
            </span>
          ) : null}
        </div>

        {row.provider_name ? (
          <span
            className="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "rgba(255,255,255,0.50)",
            }}
          >
            {row.provider_name}
          </span>
        ) : null}
      </div>

      {/* Score box */}
      <div className="relative mt-4">
        <div
          className="rounded-[16px] p-4"
          style={{
            background: "rgba(0,0,0,0.30)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div className="space-y-4">
            <TeamRow name={home} score={row.home_score} isFollowed={followState.isHomeFollowed} isLive={isLive} />
            <div style={{ height: "1px", background: "rgba(255,255,255,0.07)" }} />
            <TeamRow name={away} score={row.away_score} isFollowed={followState.isAwayFollowed} isLive={isLive} side="right" />
          </div>
        </div>
      </div>

      {/* Match details */}
      <div className="relative mt-4 grid gap-2 sm:grid-cols-2">
        <div
          className="rounded-[14px] px-4 py-3"
          style={{
            background: "rgba(0,0,0,0.22)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div
            className="text-[10px] font-black uppercase tracking-[0.26em]"
            style={{ color: "rgba(255,255,255,0.36)" }}
          >
            Kickoff
          </div>
          <div
            className="mt-1 text-[13px] font-bold"
            style={{ color: "rgba(255,255,255,0.90)" }}
          >
            {kickoff ? formatKickoffDay(kickoff) : "TBD"}
          </div>
          <div className="mt-0.5 text-[12px]" style={{ color: "rgba(255,255,255,0.52)" }}>
            {kickoff ? formatKickoffTime(kickoff) : "Kickoff TBD"}
          </div>
        </div>

        <div
          className="rounded-[14px] px-4 py-3"
          style={{
            background: "rgba(0,0,0,0.22)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <div
            className="text-[10px] font-black uppercase tracking-[0.26em]"
            style={{ color: "rgba(255,255,255,0.36)" }}
          >
            Venue
          </div>
          <div
            className="mt-1 truncate text-[13px] font-bold"
            style={{ color: "rgba(255,255,255,0.90)" }}
          >
            {formatVenue(row)}
          </div>
          <div className="mt-0.5 truncate text-[12px]" style={{ color: "rgba(255,255,255,0.52)" }}>
            {[row.venue_city, row.venue_country].filter(Boolean).join(", ") || "Location TBD"}
            {timezoneLabel ? ` · ${timezoneLabel}` : ""}
          </div>
        </div>
      </div>

      {/* CTAs */}
      <div className="relative mt-4 flex flex-wrap gap-2.5">
        <Link
          href={watchHref}
          target={row.provider_web_url?.trim() ? "_blank" : undefined}
          rel={row.provider_web_url?.trim() ? "noreferrer" : undefined}
          className="inline-flex h-9 items-center justify-center rounded-[12px] px-4 text-[12px] font-black transition-all hover:scale-[1.02] active:scale-[0.97]"
          style={
            isLive
              ? {
                  background: "linear-gradient(135deg, rgba(52,211,153,0.20) 0%, rgba(52,211,153,0.10) 100%)",
                  border: "1px solid rgba(52,211,153,0.40)",
                  color: "#6ee7b7",
                  boxShadow: "0 0 20px -4px rgba(52,211,153,0.22)",
                }
              : {
                  background: "linear-gradient(180deg, #ffffff 0%, #d8d8d8 100%)",
                  color: "#000000",
                  boxShadow: "0 6px 18px -8px rgba(255,255,255,0.44)",
                }
          }
        >
          {isLive ? "Watch Live" : row.provider_name ? `Watch ${row.provider_name}` : "Watch"}
        </Link>

        <Link
          href={detailHref}
          className="inline-flex h-9 items-center justify-center rounded-[12px] px-4 text-[12px] font-semibold transition-all hover:bg-white/[0.08]"
          style={{
            color: "rgba(255,255,255,0.86)",
            border: "1px solid rgba(255,255,255,0.20)",
            background: "rgba(255,255,255,0.06)",
          }}
        >
          {getReminderLabel(row.reminderState)}
        </Link>
      </div>
    </article>
  );
}

function SectionBlock({
  section,
  followedTeamIds,
}: {
  section: SectionItem;
  followedTeamIds: Set<string>;
}) {
  const isLiveSoon = section.key === "live-soon";

  return (
    <section className="mt-14">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            {isLiveSoon && (
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 8px rgba(52,211,153,1)" }} />
              </span>
            )}
            <span
              className="text-[9px] font-black uppercase tracking-[0.36em]"
              style={{ color: isLiveSoon ? "rgba(52,211,153,0.80)" : "rgba(255,255,255,0.38)" }}
            >
              World Cup 2026
            </span>
          </div>
          <h2
            className="mt-2 font-black leading-tight tracking-[-0.04em] text-white"
            style={{ fontSize: "clamp(22px, 2.4vw, 30px)" }}
          >
            {section.title}
          </h2>
        </div>

        <span
          className="rounded-full px-3.5 py-1.5 text-[12px] font-semibold"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.60)",
          }}
        >
          {section.data.length} match{section.data.length === 1 ? "" : "es"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {section.data.map((row) => (
          <MatchCard
            key={row.sports_event_id}
            row={row}
            followedTeamIds={followedTeamIds}
          />
        ))}
      </div>
    </section>
  );
}

function EmptyState({
  title,
  body,
  buttonHref,
  buttonLabel,
}: {
  title: string;
  body: string;
  buttonHref?: string;
  buttonLabel?: string;
}) {
  return (
    <section className="relative mt-14 overflow-hidden rounded-[26px] p-8">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "linear-gradient(145deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.32) 30%, rgba(255,255,255,0.32) 70%, transparent)",
        }}
      />
      <div className="relative max-w-2xl">
        <span
          className="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em]"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.56)",
          }}
        >
          World Cup 2026
        </span>
        <h2
          className="mt-4 font-black leading-tight tracking-[-0.04em] text-white"
          style={{ fontSize: "clamp(22px, 2.6vw, 32px)" }}
        >
          {title}
        </h2>
        <p className="mt-3 text-[14px] leading-7" style={{ color: "rgba(255,255,255,0.58)" }}>
          {body}
        </p>
        {buttonHref && buttonLabel ? (
          <div className="mt-6">
            <Link
              href={buttonHref}
              className="inline-flex h-10 items-center justify-center rounded-[13px] px-6 text-[13px] font-black text-black transition-all hover:scale-[1.02]"
              style={{
                background: "linear-gradient(180deg, #ffffff 0%, #d8d8d8 100%)",
                boxShadow: "0 8px 24px -10px rgba(255,255,255,0.44)",
              }}
            >
              {buttonLabel}
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SportsPage({
  searchParams,
}: {
  searchParams?: Promise<{ mode?: string | string[] }> | { mode?: string | string[] };
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const modeParam = Array.isArray(resolvedSearchParams?.mode)
    ? resolvedSearchParams?.mode[0]
    : resolvedSearchParams?.mode;

  const mode: ScreenMode = modeParam === "my-teams" ? "my-teams" : "all";

  const { rows, userId, followedTeamIds, errorText } = await loadWorldCupData();

  const myTeamRows = filterRowsForMyTeams(rows, followedTeamIds);
  const activeRows = mode === "my-teams" ? myTeamRows : rows;
  const sections = buildSections(activeRows);

  const nextKickoff = getNextKickoff(activeRows);
  const featuredMatch =
    getStartingSoonRows(activeRows, new Date())[0] ?? activeRows[0] ?? null;

  const todayCount = getTodayRows(activeRows, new Date()).length;
  const soonCount = getStartingSoonRows(activeRows, new Date()).length;
  const liveCount = activeRows.filter((row) => getStatusCode(row) === "live").length;
  const remindersEnabledCount = activeRows.filter(
    (row) => row.reminderState.enabled && !row.reminderState.suppressed
  ).length;

  const showingMyTeamsEmpty = mode === "my-teams" && followedTeamIds.size === 0;
  const noMatchesAtAll = rows.length === 0;
  const noActiveMatches = activeRows.length === 0;

  return (
    <main
      className="min-h-screen text-white"
      style={{ background: "#080808" }}
    >
      {/* Global ambient grain */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_-10%,rgba(255,255,255,0.03),transparent)]" />

      <div className="relative mx-auto max-w-[1400px] px-4 py-10 sm:px-6 lg:px-8">

        {/* ── Hero header ───────────────────────────────────────────────────── */}
        <section
          className="relative overflow-hidden rounded-[28px]"
          style={{
            background: "linear-gradient(145deg, rgba(22,22,22,0.98) 0%, rgba(12,12,12,0.98) 100%)",
            border: "1px solid rgba(255,255,255,0.18)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.04) inset, 0 48px 120px -48px rgba(0,0,0,1)",
          }}
        >
          {/* Specular top highlight */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent 5%, rgba(255,255,255,0.42) 25%, rgba(255,255,255,0.42) 75%, transparent 95%)",
            }}
          />
          {/* Emerald ambient glow top-left */}
          <div
            className="pointer-events-none absolute left-0 top-0 h-[400px] w-[400px] rounded-full blur-3xl"
            style={{
              background: "rgba(52,211,153,0.07)",
              transform: "translate(-30%, -30%)",
            }}
          />
          {/* Subtle white glow top-right */}
          <div
            className="pointer-events-none absolute right-0 top-0 h-[300px] w-[300px] rounded-full blur-3xl"
            style={{
              background: "rgba(255,255,255,0.04)",
              transform: "translate(25%, -25%)",
            }}
          />

          <div className="relative p-6 sm:p-8 lg:p-10">
            {/* Top grid */}
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_380px] lg:items-start">

              {/* Left — copy + tabs */}
              <div>
                {/* Eyebrow */}
                <div className="flex items-center gap-2.5">
                  <span
                    className="inline-flex h-1.5 w-1.5 rounded-full"
                    style={{
                      background: "#34d399",
                      boxShadow: "0 0 8px rgba(52,211,153,0.9)",
                    }}
                  />
                  <div
                    className="h-px w-5"
                    style={{
                      background: "linear-gradient(90deg, rgba(52,211,153,0.6), rgba(255,255,255,0.10))",
                    }}
                  />
                  <span
                    className="text-[10px] font-black uppercase tracking-[0.36em]"
                    style={{ color: "rgba(255,255,255,0.44)" }}
                  >
                    WatchWeek · World Cup
                  </span>
                </div>

                <h1
                  className="mt-4 font-black leading-[0.92] tracking-[-0.055em] text-white"
                  style={{ fontSize: "clamp(2rem, 4vw, 3.8rem)" }}
                >
                  Tournament command,{" "}
                  <span style={{ color: "rgba(255,255,255,0.52)" }}>
                    full slate back on the page.
                  </span>
                </h1>

                <p
                  className="mt-4 max-w-[52ch] text-[15px] leading-[1.72]"
                  style={{ color: "rgba(255,255,255,0.60)" }}
                >
                  Live windows first. Then today, tomorrow, later this week, and
                  the wider coming-up runway — built from the same World Cup cards
                  dataset and bucket logic as the app.
                </p>

                {/* Mode tabs */}
                <div className="mt-7 flex flex-wrap items-center gap-4">
                  <div
                    className="inline-flex rounded-full p-1"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.12)",
                    }}
                  >
                    <Link
                      href="/sports?mode=all"
                      className="rounded-full px-5 py-2 text-[13px] font-black transition-all"
                      style={
                        mode === "all"
                          ? {
                              background: "rgba(255,255,255,0.12)",
                              color: "#ffffff",
                              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
                            }
                          : { color: "rgba(255,255,255,0.50)" }
                      }
                    >
                      All Matches · {rows.length}
                    </Link>
                    <Link
                      href="/sports?mode=my-teams"
                      className="rounded-full px-5 py-2 text-[13px] font-black transition-all"
                      style={
                        mode === "my-teams"
                          ? {
                              background: "rgba(52,211,153,0.16)",
                              color: "#6ee7b7",
                              border: "1px solid rgba(52,211,153,0.28)",
                            }
                          : { color: "rgba(255,255,255,0.50)" }
                      }
                    >
                      My Teams · {myTeamRows.length}
                    </Link>
                  </div>

                  <span
                    className="text-[12px] font-medium"
                    style={{ color: "rgba(255,255,255,0.42)" }}
                  >
                    {mode === "my-teams"
                      ? "Filtered to teams you follow."
                      : "Showing the full tournament."}
                  </span>
                </div>

                {/* Error */}
                {errorText ? (
                  <div
                    className="mt-5 flex max-w-2xl items-start gap-3 rounded-[16px] px-4 py-3 text-[13px]"
                    style={{
                      background: "rgba(251,191,36,0.10)",
                      border: "1px solid rgba(251,191,36,0.28)",
                      color: "#fcd34d",
                    }}
                  >
                    <span className="mt-0.5 shrink-0">⚠</span>
                    <span>{errorText}</span>
                  </div>
                ) : null}
              </div>

              {/* Right — metric cards */}
              <div className="grid grid-cols-2 gap-2.5">
                <MetricCard
                  label={mode === "my-teams" ? "My Matches" : "Today"}
                  value={mode === "my-teams" ? myTeamRows.length : todayCount}
                  tone="accent"
                />
                <MetricCard
                  label="Soon"
                  value={soonCount}
                  tone={soonCount > 0 ? "live" : "neutral"}
                />
                <MetricCard
                  label="Live"
                  value={liveCount}
                  tone={liveCount > 0 ? "live" : "neutral"}
                />
                <MetricCard
                  label={mode === "my-teams" ? "Teams" : "Reminders"}
                  value={mode === "my-teams" ? followedTeamIds.size : remindersEnabledCount}
                />
              </div>
            </div>

            {/* Bottom grid — countdown + featured */}
            <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
              {/* Countdown card */}
              <div
                className="relative overflow-hidden rounded-[20px] p-6"
                style={{
                  background: "rgba(0,0,0,0.30)",
                  border: "1px solid rgba(255,255,255,0.10)",
                }}
              >
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-px"
                  style={{
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.28) 30%, rgba(255,255,255,0.28) 70%, transparent)",
                  }}
                />
                <div
                  className="text-[9px] font-black uppercase tracking-[0.38em]"
                  style={{ color: "rgba(255,255,255,0.38)" }}
                >
                  Next Kickoff
                </div>
                <div
                  className="mt-2 font-black tabular-nums leading-none tracking-[-0.06em] text-white"
                  style={{ fontSize: "clamp(42px, 5vw, 64px)" }}
                >
                  {formatCountdown(nextKickoff)}
                </div>
                <div
                  className="mt-2 text-[13px] font-semibold"
                  style={{ color: "rgba(255,255,255,0.52)" }}
                >
                  {nextKickoff ? formatHeaderDate(nextKickoff) : "No upcoming kickoff found"}
                </div>
                <div
                  className="mt-4 max-w-xl text-[13px] leading-[1.72]"
                  style={{ color: "rgba(255,255,255,0.46)" }}
                >
                  {mode === "my-teams"
                    ? "Your followed-team slate uses the same tournament buckets as the main World Cup screen."
                    : "This page mirrors the app structure instead of shrinking the tournament down to a few rails."}
                </div>
              </div>

              {/* Featured match */}
              {featuredMatch ? (
                <FeaturedMatchCard
                  row={featuredMatch}
                  detailHref={`/sports/${featuredMatch.sports_event_id}`}
                />
              ) : null}
            </div>
          </div>
        </section>

        {/* ── Match sections ─────────────────────────────────────────────────── */}

        {showingMyTeamsEmpty ? (
          <EmptyState
            title={userId ? "No teams followed yet." : "Sign in to use My Teams."}
            body={
              userId
                ? "Switch back to All Matches and follow national teams from your app flow so your personal tournament view has something to show."
                : "My Teams depends on your existing followed teams. Sign in, then come back to this view."
            }
            buttonHref="/sports?mode=all"
            buttonLabel="Browse All Matches"
          />
        ) : null}

        {!showingMyTeamsEmpty && noMatchesAtAll ? (
          <EmptyState
            title="No World Cup matches were returned."
            body="Check the v_world_cup_2026_cards view and confirm World Cup 2026 rows are available."
          />
        ) : null}

        {!showingMyTeamsEmpty && !noMatchesAtAll && noActiveMatches ? (
          <EmptyState
            title="No matches in this view right now."
            body="The World Cup data loaded, but this specific filter has no visible matches."
            buttonHref="/sports?mode=all"
            buttonLabel="See All Matches"
          />
        ) : null}

        {!showingMyTeamsEmpty &&
          !noMatchesAtAll &&
          !noActiveMatches &&
          sections.map((section) => (
            <SectionBlock
              key={section.key}
              section={section}
              followedTeamIds={followedTeamIds}
            />
          ))}
      </div>
    </main>
  );
}
