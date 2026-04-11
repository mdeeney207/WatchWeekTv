// web/lib/home/normalizeEpisodeCandidate.ts

import { HomeCandidate, ReleaseStatus } from "./types";

export type NormalizeEpisodeInput = {
  id: string;

  showId: string;
  episodeId?: string | null;
  tmdbId?: number | null;

  title?: string | null;
  showTitle: string;
  episodeTitle?: string | null;

  seasonNumber?: number | null;
  episodeNumber?: number | null;

  provider?: string | null;
  providerSlug?: string | null;

  airDateISO?: string | null;
  isScheduleVerified?: boolean | null;
  nowMs?: number | null;

  posterUrl?: string | null;
  backdropUrl?: string | null;

  relationship?: "followed" | "recommended" | "trending" | "editorial";
  reason?:
    | "because_you_follow"
    | "similar_to_followed"
    | "trending_now"
    | "new_release"
    | "editorial_pick";
  source?: string | null;
};

const AIR_DATE_DAY_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})/;
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const UTC_MIDNIGHT_RE = /T00:00(?::00(?:\.0+)?)?(?:Z|[+-]00:00)?$/i;

function resolveNowMs(nowMs?: number | null) {
  return typeof nowMs === "number" && Number.isFinite(nowMs) ? nowMs : Date.now();
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function dayKeyFromDate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function dayKeyFromUtcDate(d: Date) {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(
    d.getUTCDate()
  )}`;
}

function getAirDateDayKey(value?: string | null) {
  const raw = String(value ?? "").trim();
  const match = raw.match(AIR_DATE_DAY_KEY_RE);

  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  if (!raw) return null;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;

  return dayKeyFromUtcDate(parsed);
}

function isDateOnlyAirDate(value?: string | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return false;
  if (DATE_ONLY_RE.test(raw)) return true;

  const normalized = raw.replace(" ", "T");
  return UTC_MIDNIGHT_RE.test(normalized);
}

function parsePreciseAirDate(value?: string | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (isDateOnlyAirDate(raw)) return null;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function providerToSlug(provider?: string | null) {
  const value = String(provider ?? "").trim().toLowerCase();

  switch (value) {
    case "netflix":
      return "netflix";
    case "hulu":
      return "hulu";
    case "max":
      return "max";
    case "prime video":
    case "primevideo":
    case "amazon prime video":
      return "prime-video";
    case "disney+":
    case "disney plus":
      return "disney-plus";
    case "apple tv+":
    case "apple tv plus":
      return "apple-tv-plus";
    case "peacock":
      return "peacock";
    case "paramount+":
    case "paramount plus":
      return "paramount-plus";
    case "abc":
      return "abc";
    case "fox":
      return "fox";
    case "nbc":
      return "nbc";
    case "cbs":
      return "cbs";
    case "starz":
      return "starz";
    case "showtime":
      return "showtime";
    case "amc+":
    case "amc plus":
      return "amc-plus";
    default:
      return value.replace(/\s+/g, "-") || "unknown";
  }
}

function labelFromProviderSlug(providerSlug?: string | null) {
  switch (String(providerSlug ?? "").trim().toLowerCase()) {
    case "netflix":
      return "Netflix";
    case "hulu":
      return "Hulu";
    case "max":
      return "Max";
    case "prime-video":
      return "Prime Video";
    case "disney-plus":
      return "Disney+";
    case "apple-tv-plus":
      return "Apple TV+";
    case "peacock":
      return "Peacock";
    case "paramount-plus":
      return "Paramount+";
    case "abc":
      return "ABC";
    case "fox":
      return "FOX";
    case "nbc":
      return "NBC";
    case "cbs":
      return "CBS";
    case "starz":
      return "Starz";
    case "showtime":
      return "Showtime";
    case "amc-plus":
      return "AMC+";
    default:
      return null;
  }
}

function resolveScheduleVerification(
  airDateISO?: string | null,
  isScheduleVerified?: boolean | null
) {
  const releaseDayKey = getAirDateDayKey(airDateISO);
  const isDateOnly = isDateOnlyAirDate(airDateISO);
  const preciseAirDate = parsePreciseAirDate(airDateISO);
  const hasScheduleCapableDate = Boolean(releaseDayKey);
  const isDayVerified = hasScheduleCapableDate && isScheduleVerified === true;
  const isTimeVerified = Boolean(preciseAirDate) && isScheduleVerified === true;

  return {
    hasScheduleCapableDate,
    isDayVerified,
    isTimeVerified,
    isDateOnly,
    releaseDayKey,
    preciseAirDate,
  };
}

function getReleaseStatus(
  input: {
    isDayVerified: boolean;
    isTimeVerified: boolean;
    releaseDayKey: string | null;
    preciseAirDate: Date | null;
  },
  nowMs?: number | null
): ReleaseStatus {
  const now = new Date(resolveNowMs(nowMs));

  if (input.isTimeVerified && input.preciseAirDate) {
    const diffMs = input.preciseAirDate.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffHours <= 0.5 && diffHours >= -6) return "live_now";
    if (diffHours > 0.5 && diffHours <= 6) return "starting_soon";
    if (diffHours > 6 && diffHours <= 24) return "tonight";
    if (diffHours > 24 && diffHours <= 48) return "tomorrow";
    if (diffDays > 2 && diffDays <= 7) return "this_week";
    if (diffDays < 0 && diffDays >= -7) return "recently_dropped";
    return "upcoming";
  }

  if (input.isDayVerified && input.releaseDayKey) {
    const todayKey = dayKeyFromDate(now);
    const tomorrowKey = dayKeyFromDate(
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
    );
    const nextSevenKey = dayKeyFromDate(
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7)
    );
    const sevenDaysAgoKey = dayKeyFromDate(
      new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
    );
    const releaseDayKey = input.releaseDayKey;

    if (releaseDayKey === todayKey) return "tonight";
    if (releaseDayKey === tomorrowKey) return "tomorrow";
    if (releaseDayKey > tomorrowKey && releaseDayKey <= nextSevenKey) {
      return "this_week";
    }
    if (releaseDayKey < todayKey && releaseDayKey >= sevenDaysAgoKey) {
      return "recently_dropped";
    }
    return "upcoming";
  }

  return "upcoming";
}

function getUrgencyScore(status: ReleaseStatus) {
  switch (status) {
    case "live_now":
      return 100;
    case "starting_soon":
      return 92;
    case "tonight":
      return 84;
    case "tomorrow":
      return 72;
    case "this_week":
      return 58;
    case "recently_dropped":
      return 50;
    case "upcoming":
    default:
      return 34;
  }
}

function getFreshnessScore(
  input: {
    isDayVerified: boolean;
    isTimeVerified: boolean;
    releaseDayKey: string | null;
    preciseAirDate: Date | null;
  },
  nowMs?: number | null
) {
  const now = new Date(resolveNowMs(nowMs));

  if (input.isTimeVerified && input.preciseAirDate) {
    const diffMs = Math.abs(now.getTime() - input.preciseAirDate.getTime());
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours <= 6) return 100;
    if (diffHours <= 24) return 92;
    if (diffHours <= 48) return 84;
    if (diffHours <= 24 * 7) return 72;
    if (diffHours <= 24 * 14) return 58;
    return 42;
  }

  if (input.isDayVerified && input.releaseDayKey) {
    const todayKey = dayKeyFromDate(now);
    const releaseDayKey = input.releaseDayKey;

    if (releaseDayKey === todayKey) return 92;

    const releaseDay = new Date(`${releaseDayKey}T12:00:00`);
    const diffMs = Math.abs(now.getTime() - releaseDay.getTime());
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays <= 1) return 84;
    if (diffDays <= 7) return 72;
    if (diffDays <= 14) return 58;
    return 42;
  }

  return 30;
}

function getProviderScore(providerSlug?: string | null) {
  switch (providerSlug) {
    case "netflix":
    case "hulu":
    case "max":
    case "prime-video":
    case "disney-plus":
    case "apple-tv-plus":
      return 78;
    case "peacock":
    case "paramount-plus":
      return 68;
    case "abc":
    case "fox":
    case "nbc":
    case "cbs":
      return 62;
    default:
      return 55;
  }
}

function getRelevanceScore(input: NormalizeEpisodeInput) {
  const relationship = input.relationship ?? "followed";
  const reason = input.reason ?? "because_you_follow";

  let score = 72;

  switch (relationship) {
    case "followed":
      score += 18;
      break;
    case "recommended":
      score += 8;
      break;
    case "editorial":
      score += 5;
      break;
    case "trending":
    default:
      score += 0;
      break;
  }

  switch (reason) {
    case "because_you_follow":
      score += 8;
      break;
    case "new_release":
      score += 6;
      break;
    case "editorial_pick":
      score += 4;
      break;
    case "similar_to_followed":
      score += 3;
      break;
    case "trending_now":
    default:
      score += 0;
      break;
  }

  return Math.min(score, 100);
}

function buildSubtitle(input: NormalizeEpisodeInput) {
  const season =
    typeof input.seasonNumber === "number" && Number.isFinite(input.seasonNumber)
      ? `S${String(input.seasonNumber).padStart(2, "0")}`
      : null;

  const episode =
    typeof input.episodeNumber === "number" &&
    Number.isFinite(input.episodeNumber)
      ? `E${String(input.episodeNumber).padStart(2, "0")}`
      : null;

  const code = [season, episode].filter(Boolean).join("");

  if (code && input.episodeTitle) return `${code} • ${input.episodeTitle}`;
  if (code) return code;
  if (input.episodeTitle) return input.episodeTitle;

  return undefined;
}

export function normalizeEpisodeCandidate(
  input: NormalizeEpisodeInput
): HomeCandidate {
  const schedule = resolveScheduleVerification(
    input.airDateISO,
    input.isScheduleVerified
  );

  const normalizedProviderSlug =
    String(input.providerSlug ?? "").trim().toLowerCase() ||
    providerToSlug(input.provider ?? null);

  const normalizedProvider =
    String(input.provider ?? "").trim() ||
    labelFromProviderSlug(normalizedProviderSlug) ||
    "Unknown";

  const releaseStatus = getReleaseStatus(schedule, input.nowMs);
  const urgencyScore = schedule.isDayVerified
    ? getUrgencyScore(releaseStatus)
    : 24;
  const freshnessScore = schedule.isDayVerified
    ? getFreshnessScore(schedule, input.nowMs)
    : 34;
  const providerScore = getProviderScore(normalizedProviderSlug);
  const relevanceScore = getRelevanceScore(input);

  const sourceRailHints: HomeCandidate["sourceRailHints"] = schedule.isTimeVerified
    ? ["hero", "starting_soon", "tonight_picks", "coming_this_week", "coming_soon"]
    : schedule.isDayVerified
      ? ["hero", "tonight_picks", "coming_this_week", "coming_soon", "because_you_follow"]
      : ["because_you_follow"];

  return {
    id: input.id,
    type: "episode",

    title: String(input.showTitle ?? input.title ?? "").trim(),
    subtitle: buildSubtitle(input),

    posterUrl: input.posterUrl ?? undefined,
    backdropUrl: input.backdropUrl ?? undefined,

    provider: normalizedProvider,
    providerSlug: normalizedProviderSlug,

    releaseAt: schedule.isTimeVerified && input.airDateISO ? input.airDateISO : null,
    releaseStatus,

    relationship: input.relationship ?? "followed",
    reason: input.reason ?? "because_you_follow",
    source: input.source ?? "episodes",

    sourceRailHints,

    urgencyScore,
    relevanceScore,
    freshnessScore,
    providerScore,

    tmdbId: input.tmdbId ?? null,
    showId: input.showId,
    episodeId: input.episodeId ?? input.id,

    meta: {
      isDayVerified: schedule.isDayVerified,
      isTimeVerified: schedule.isTimeVerified,
      releaseDayKey: schedule.releaseDayKey,
      isDateOnly: schedule.isDateOnly,
      originalReleaseAt: input.airDateISO ?? null,
      isScheduleVerified: input.isScheduleVerified === true,
      hasAiringDate: schedule.hasScheduleCapableDate,
      candidateKind: "episode",
      episodeTitle: input.episodeTitle ?? null,
      seasonNumber: input.seasonNumber ?? null,
      episodeNumber: input.episodeNumber ?? null,
      originalTitle: input.title ?? null,
    },
  };
}