// web/lib/home/normalizeCandidate.ts

import { HomeCandidate, RailHint, ReleaseStatus } from "./types";

/**
 * NOTES:
 * - This file is the normalization layer for homepage candidates.
 * - Its job is to convert raw page/data inputs into a consistent HomeCandidate shape
 *   that the Global Drop Engine can score + assign to rails.
 * - Keep this file focused on translation/normalization, not fetching.
 * - Important product rule:
 *   "Drops Tonight" must only contain truly imminent releases.
 *   Anything beyond that belongs in This Week or Coming Soon.
 * - Production rule:
 *   A syntactically valid ISO timestamp is NOT enough to make a candidate
 *   eligible for time-sensitive rails. Upstream must explicitly mark the
 *   schedule as trusted/verified.
 */

type NormalizeBaseInput = {
  id: string;
  tmdbId?: number | null;
  title: string;

  posterUrl?: string | null;
  backdropUrl?: string | null;
  provider?: string | null;

  /**
   * Candidate content type.
   * Do not infer "episode" merely because a date exists.
   * Upstream should tell us what kind of entity this candidate is.
   */
  type?: HomeCandidate["type"] | null;

  /**
   * Optional schedule timestamp.
   * This is only schedule-capable data until explicitly verified.
   */
  nextAirsAtISO?: string | null;

  /**
   * Explicit upstream trust flag.
   * Time-aware rails should only use the schedule when this is true.
   */
  isScheduleVerified?: boolean | null;

  /**
   * Deterministic scoring support.
   * If not provided, Date.now() is used.
   */
  nowMs?: number | null;
};

export type NormalizeFollowedInput = NormalizeBaseInput & {};

export type NormalizeTrendingInput = NormalizeBaseInput & {
  releaseStatus?: ReleaseStatus | null;
  sourceRailHints?: RailHint[] | null;
};

export type NormalizeRecommendedInput = NormalizeBaseInput & {
  /**
   * seedShowId / seedShowTitle represent the followed show that caused this
   * recommendation to exist.
   */
  seedShowId?: string | null;
  seedShowTitle?: string | null;

  /**
   * Optional upstream hint injection.
   */
  releaseStatus?: ReleaseStatus | null;
  sourceRailHints?: RailHint[] | null;
};

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
      return "prime-video";
    case "disney+":
      return "disney-plus";
    case "apple tv+":
      return "apple-tv-plus";
    case "peacock":
      return "peacock";
    case "paramount+":
      return "paramount-plus";
    case "starz":
      return "starz";
    case "showtime":
      return "showtime";
    case "amc+":
      return "amc-plus";
    case "trending":
      return "trending";
    default:
      return value.replace(/\s+/g, "-") || "unknown";
  }
}

/**
 * Checks whether a release date is syntactically valid.
 * This does NOT prove schedule trust.
 */
function hasValidReleaseDate(value?: string | null) {
  if (!value) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
}

function resolveNowMs(nowMs?: number | null) {
  return typeof nowMs === "number" && Number.isFinite(nowMs) ? nowMs : Date.now();
}

/**
 * Release status is intentionally homepage-centric, not exact scheduling truth.
 * We use buckets because the engine only needs meaningful urgency bands.
 *
 * Mapping philosophy:
 * - live_now / starting_soon / tonight = Drops Tonight eligible
 * - tomorrow / this_week = This Week eligible
 * - beyond 7 days = Coming Soon eligible
 */
function getReleaseStatus(
  airDate: Date | null,
  nowMs?: number | null
): ReleaseStatus {
  if (!airDate) return "upcoming";

  const diffMs = airDate.getTime() - resolveNowMs(nowMs);

  if (diffMs >= -90 * 60 * 1000 && diffMs <= 0) return "live_now";
  if (diffMs < -90 * 60 * 1000) return "recently_dropped";
  if (diffMs <= 6 * 60 * 60 * 1000) return "starting_soon";

  const hours = diffMs / (1000 * 60 * 60);

  if (hours <= 24) return "tonight";
  if (hours <= 48) return "tomorrow";
  if (hours <= 7 * 24) return "this_week";

  return "upcoming";
}

function getUrgencyScore(status: ReleaseStatus) {
  switch (status) {
    case "live_now":
      return 100;
    case "starting_soon":
      return 92;
    case "tonight":
      return 82;
    case "tomorrow":
      return 62;
    case "this_week":
      return 44;
    case "recently_dropped":
      return 64;
    case "upcoming":
    default:
      return 22;
  }
}

function getFreshnessScore(status: ReleaseStatus) {
  switch (status) {
    case "live_now":
      return 100;
    case "starting_soon":
      return 95;
    case "tonight":
      return 88;
    case "tomorrow":
      return 70;
    case "this_week":
      return 54;
    case "recently_dropped":
      return 78;
    case "upcoming":
    default:
      return 30;
  }
}

function getFollowedReason(
  status: ReleaseStatus,
  isTimeVerified: boolean
): HomeCandidate["reason"] {
  if (!isTimeVerified) return "because_you_follow";

  switch (status) {
    case "live_now":
    case "starting_soon":
      return "live_event";
    case "tonight":
    case "tomorrow":
    case "this_week":
    case "upcoming":
      return "new_release";
    case "recently_dropped":
    default:
      return "because_you_follow";
  }
}

/**
 * These are hints, not hard placement guarantees.
 * The engine decides final rail membership later.
 */
function getFollowedHints(
  status: ReleaseStatus,
  isTimeVerified: boolean
): RailHint[] {
  const hints = new Set<RailHint>();

  /**
   * Followed items should always be eligible for Because You Follow.
   */
  hints.add("because_you_follow");

  if (!isTimeVerified) {
    return Array.from(hints);
  }

  if (
    status === "live_now" ||
    status === "starting_soon" ||
    status === "tonight" ||
    status === "tomorrow" ||
    status === "this_week"
  ) {
    hints.add("hero");
  }

  if (
    status === "live_now" ||
    status === "starting_soon" ||
    status === "tonight"
  ) {
    hints.add("tonight_picks");
  }

  if (status === "starting_soon") {
    hints.add("starting_soon");
  }

  if (status === "tomorrow" || status === "this_week") {
    hints.add("coming_this_week");
  }

  if (status === "upcoming") {
    hints.add("coming_soon");
  }

  return Array.from(hints);
}

/**
 * Recommendations should always be eligible for Because You Follow.
 * If a recommended item also has trusted timing relevance, let it participate in
 * time-aware rails too.
 */
function getRecommendedHints(
  status: ReleaseStatus,
  isTimeVerified: boolean,
  explicitHints?: RailHint[] | null
): RailHint[] {
  const hints = new Set<RailHint>(explicitHints ?? []);

  hints.add("because_you_follow");

  if (!isTimeVerified) {
    return Array.from(hints);
  }

  if (
    status === "live_now" ||
    status === "starting_soon" ||
    status === "tonight"
  ) {
    hints.add("tonight_picks");
  }

  if (status === "starting_soon") {
    hints.add("starting_soon");
  }

  if (status === "tomorrow" || status === "this_week") {
    hints.add("coming_this_week");
  }

  if (status === "upcoming") {
    hints.add("coming_soon");
  }

  return Array.from(hints);
}

function getTrendingHints(
  status: ReleaseStatus,
  isTimeVerified: boolean,
  explicitHints?: RailHint[] | null
): RailHint[] {
  const hints = new Set<RailHint>(explicitHints ?? []);

  hints.add("trending");

  if (!isTimeVerified) {
    return Array.from(hints);
  }

  if (
    status === "live_now" ||
    status === "starting_soon" ||
    status === "tonight"
  ) {
    hints.add("tonight_picks");
  }

  if (status === "starting_soon") {
    hints.add("starting_soon");
  }

  if (status === "tomorrow" || status === "this_week") {
    hints.add("coming_this_week");
  }

  if (status === "upcoming") {
    hints.add("coming_soon");
  }

  return Array.from(hints);
}

function resolveCandidateType(
  type: HomeCandidate["type"] | null | undefined,
  isTimeVerified: boolean
): HomeCandidate["type"] {
  if (type) return type;

  /**
   * Never auto-upcast unknown content into episode just because it has a date.
   * Default to show unless upstream explicitly says otherwise.
   */
  return isTimeVerified ? "show" : "show";
}

function resolveTimeVerification(
  nextAirsAtISO?: string | null,
  isScheduleVerified?: boolean | null
) {
  const hasScheduleCapableDate = hasValidReleaseDate(nextAirsAtISO);
  const isTimeVerified = hasScheduleCapableDate && isScheduleVerified === true;
  const airDate = isTimeVerified ? new Date(nextAirsAtISO!) : null;

  return {
    hasScheduleCapableDate,
    isTimeVerified,
    airDate,
  };
}

/**
 * Normalize a followed show into a HomeCandidate.
 */
export function normalizeFollowedShow(
  show: NormalizeFollowedInput
): HomeCandidate {
  const { hasScheduleCapableDate, isTimeVerified, airDate } =
    resolveTimeVerification(show.nextAirsAtISO, show.isScheduleVerified);

  const releaseStatus = getReleaseStatus(airDate, show.nowMs);
  const type = resolveCandidateType(show.type, isTimeVerified);

  return {
    id: `follow-${show.id}`,
    type,

    showId: show.id,
    tmdbId: show.tmdbId ?? null,
    title: show.title,
    subtitle: show.provider ?? undefined,

    posterUrl: show.posterUrl ?? undefined,
    backdropUrl: show.backdropUrl ?? undefined,

    provider: show.provider ?? null,
    providerSlug: providerToSlug(show.provider),

    releaseAt: isTimeVerified ? show.nextAirsAtISO ?? null : null,
    releaseStatus,

    relationship: "followed",
    source: isTimeVerified ? "followed_schedule" : "followed_library",

    reason: getFollowedReason(releaseStatus, isTimeVerified),

    seedShowId: null,
    seedShowTitle: null,

    urgencyScore: isTimeVerified ? getUrgencyScore(releaseStatus) : 18,
    relevanceScore: 100,
    providerScore: 82,
    freshnessScore: isTimeVerified ? getFreshnessScore(releaseStatus) : 36,
    priorityScore: isTimeVerified
      ? releaseStatus === "upcoming"
        ? 74
        : 88
      : 58,
    finalScore: 0,

    sourceRailHints: getFollowedHints(releaseStatus, isTimeVerified),

    meta: {
      candidateKind: "followed",
      hasAiringDate: hasScheduleCapableDate,
      isTimeVerified,
      isScheduleVerified: show.isScheduleVerified === true,
    },
  };
}

/**
 * Normalize a trending item into a HomeCandidate.
 */
export function normalizeTrendingItem(
  item: NormalizeTrendingInput
): HomeCandidate {
  const tmdbId =
    item.tmdbId ??
    (Number.isFinite(Number(item.id)) ? Number(item.id) : null);

  const { hasScheduleCapableDate, isTimeVerified, airDate } =
    resolveTimeVerification(item.nextAirsAtISO, item.isScheduleVerified);

  const releaseStatus =
    isTimeVerified && item.releaseStatus
      ? item.releaseStatus
      : isTimeVerified
      ? getReleaseStatus(airDate, item.nowMs)
      : "upcoming";

  const type = resolveCandidateType(item.type, isTimeVerified);

  return {
    id: `trending-${item.id}`,
    type,

    showId: item.id,
    tmdbId,
    title: item.title,
    subtitle: "Trending now",

    posterUrl: item.posterUrl ?? undefined,
    backdropUrl: item.backdropUrl ?? undefined,

    provider: item.provider ?? "Trending",
    providerSlug: providerToSlug(item.provider ?? "Trending"),

    releaseAt: isTimeVerified ? item.nextAirsAtISO ?? null : null,
    releaseStatus,

    relationship: "trending",
    source: "trending_feed",

    reason: "trending_now",

    seedShowId: null,
    seedShowTitle: null,

    urgencyScore: isTimeVerified
      ? Math.max(26, getUrgencyScore(releaseStatus) - 14)
      : 18,
    relevanceScore: 58,
    providerScore: item.provider ? 52 : 40,
    freshnessScore: isTimeVerified ? getFreshnessScore(releaseStatus) : 62,
    priorityScore: isTimeVerified
      ? releaseStatus === "upcoming"
        ? 42
        : 48
      : 44,
    finalScore: 0,

    sourceRailHints: getTrendingHints(
      releaseStatus,
      isTimeVerified,
      item.sourceRailHints
    ),

    meta: {
      candidateKind: "trending",
      hasAiringDate: hasScheduleCapableDate,
      isTimeVerified,
      isScheduleVerified: item.isScheduleVerified === true,
    },
  };
}

/**
 * Normalize a recommendation item into a HomeCandidate.
 */
export function normalizeRecommendedItem(
  item: NormalizeRecommendedInput
): HomeCandidate {
  const tmdbId =
    item.tmdbId ??
    (Number.isFinite(Number(item.id)) ? Number(item.id) : null);

  const { hasScheduleCapableDate, isTimeVerified, airDate } =
    resolveTimeVerification(item.nextAirsAtISO, item.isScheduleVerified);

  const releaseStatus =
    isTimeVerified && item.releaseStatus
      ? item.releaseStatus
      : isTimeVerified
      ? getReleaseStatus(airDate, item.nowMs)
      : "upcoming";

  const type = resolveCandidateType(item.type, isTimeVerified);

  return {
    id: `recommended-${item.id}`,
    type,

    showId: item.id,
    tmdbId,
    title: item.title,
    subtitle: item.seedShowTitle
      ? `Because you follow ${item.seedShowTitle}`
      : "Recommended for you",

    posterUrl: item.posterUrl ?? undefined,
    backdropUrl: item.backdropUrl ?? undefined,

    provider: item.provider ?? null,
    providerSlug: providerToSlug(item.provider),

    releaseAt: isTimeVerified ? item.nextAirsAtISO ?? null : null,
    releaseStatus,

    relationship: "recommended",
    source: "similarity_engine",

    reason: "similar_to_followed",

    seedShowId: item.seedShowId ?? null,
    seedShowTitle: item.seedShowTitle ?? null,

    urgencyScore: isTimeVerified
      ? Math.max(24, getUrgencyScore(releaseStatus) - 8)
      : 22,
    relevanceScore: item.seedShowId ? 86 : 78,
    providerScore: item.provider ? 55 : 42,
    freshnessScore: isTimeVerified ? getFreshnessScore(releaseStatus) : 46,
    priorityScore: isTimeVerified
      ? releaseStatus === "upcoming"
        ? item.seedShowId
          ? 66
          : 58
        : item.seedShowId
        ? 72
        : 60
      : item.seedShowId
      ? 64
      : 54,
    finalScore: 0,

    sourceRailHints: getRecommendedHints(
      releaseStatus,
      isTimeVerified,
      item.sourceRailHints
    ),

    meta: {
      candidateKind: "recommended",
      hasSeed: Boolean(item.seedShowId),
      hasAiringDate: hasScheduleCapableDate,
      isTimeVerified,
      isScheduleVerified: item.isScheduleVerified === true,
    },
  };
}