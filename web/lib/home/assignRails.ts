// web/lib/home/assignRails.ts

import { HomeCandidate, HomeExperience, RailHint } from "./types";

const MAX_STARTING_SOON = 12;
const MAX_TONIGHT_PICKS = 20;
const MAX_BECAUSE_YOU_FOLLOW = 20;
const MAX_COMING_THIS_WEEK = 20;
const MAX_COMING_SOON = 24;

const MAX_APPEARANCES_PER_SHOW = 1;
const MIN_BECAUSE_YOU_FOLLOW_SCORE = 40;

function byScoreDesc(a: HomeCandidate, b: HomeCandidate) {
  return (b.finalScore ?? 0) - (a.finalScore ?? 0);
}

function normalizeToken(value: string | number | null | undefined) {
  const raw = String(value ?? "").trim().toLowerCase();
  return raw || null;
}

function normalizeTitleKey(value: string | null | undefined) {
  const raw = String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");

  return raw || null;
}

function getShowKey(item: HomeCandidate) {
  return (
    normalizeToken(item.showId) ??
    normalizeToken(item.tmdbId) ??
    normalizeToken(item.id) ??
    normalizeTitleKey(item.title) ??
    ""
  );
}

function hasHint(item: HomeCandidate, hint: RailHint) {
  return (
    Array.isArray(item.sourceRailHints) && item.sourceRailHints.includes(hint)
  );
}

function getReleaseMs(item: HomeCandidate) {
  if (!item.releaseAt) return null;
  const ms = new Date(item.releaseAt).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function isFutureTimedRelease(item: HomeCandidate) {
  const ms = getReleaseMs(item);
  if (ms === null) return false;
  return ms >= Date.now();
}

function isTimeVerified(item: HomeCandidate) {
  return Boolean(item.meta?.isTimeVerified) && Boolean(item.releaseAt);
}

function isDayVerified(item: HomeCandidate) {
  return Boolean(item.meta?.isDayVerified);
}

function isDayOrTimeVerified(item: HomeCandidate) {
  return isTimeVerified(item) || isDayVerified(item);
}

function isEligibleForHero(item: HomeCandidate) {
  if (!isDayOrTimeVerified(item)) return false;

  return (
    item.releaseStatus === "live_now" ||
    item.releaseStatus === "starting_soon" ||
    item.releaseStatus === "tonight" ||
    item.releaseStatus === "tomorrow" ||
    item.releaseStatus === "this_week"
  );
}

function isEligibleForStartingSoon(item: HomeCandidate) {
  if (!isTimeVerified(item)) return false;
  if (!isFutureTimedRelease(item)) return false;

  return item.releaseStatus === "starting_soon";
}

function isEligibleForTonight(item: HomeCandidate) {
  if (!isDayOrTimeVerified(item)) return false;

  return (
    item.releaseStatus === "live_now" ||
    item.releaseStatus === "tonight"
  );
}

function isEligibleForComingThisWeek(item: HomeCandidate) {
  if (!isDayOrTimeVerified(item)) return false;

  return (
    item.releaseStatus === "tomorrow" ||
    item.releaseStatus === "this_week"
  );
}

function isEligibleForComingSoon(item: HomeCandidate) {
  if (!isDayOrTimeVerified(item)) return false;
  return item.releaseStatus === "upcoming";
}

function isFollowedOrRecommended(item: HomeCandidate) {
  return (
    item.relationship === "followed" || item.relationship === "recommended"
  );
}

function isStrongBecauseYouFollowCandidate(item: HomeCandidate) {
  if (!isFollowedOrRecommended(item)) return false;
  if ((item.finalScore ?? 0) < MIN_BECAUSE_YOU_FOLLOW_SCORE) return false;

  /**
   * Keep this rail recommendation-oriented and personal,
   * but do not let imminent scheduled items get stolen away from
   * Drops Tonight / Starting Soon / This Week.
   */
  if (
    item.releaseStatus === "live_now" ||
    item.releaseStatus === "starting_soon" ||
    item.releaseStatus === "tonight" ||
    item.releaseStatus === "tomorrow" ||
    item.releaseStatus === "this_week"
  ) {
    return false;
  }

  if (item.relationship === "followed") return true;
  if (item.relationship === "recommended" && item.seedShowId) return true;

  return item.relationship === "recommended";
}

function canUseItem(
  item: HomeCandidate,
  usedIds: Set<string>,
  showAppearances: Map<string, number>
) {
  if (usedIds.has(item.id)) return false;

  const showKey = getShowKey(item);
  if (!showKey) return false;

  const count = showAppearances.get(showKey) ?? 0;
  return count < MAX_APPEARANCES_PER_SHOW;
}

function markUsed(
  item: HomeCandidate,
  usedIds: Set<string>,
  showAppearances: Map<string, number>
) {
  usedIds.add(item.id);

  const showKey = getShowKey(item);
  if (!showKey) return;

  const count = showAppearances.get(showKey) ?? 0;
  showAppearances.set(showKey, count + 1);
}

function buildPool(
  candidates: HomeCandidate[],
  preferredHint: RailHint,
  fallbackHints: RailHint[] = []
) {
  const preferred = candidates.filter((item) => hasHint(item, preferredHint));
  const fallbacks =
    fallbackHints.length > 0
      ? candidates.filter((item) =>
          fallbackHints.some((hint) => hasHint(item, hint))
        )
      : [];
  const remainder = candidates.filter(
    (item) =>
      !hasHint(item, preferredHint) &&
      !fallbackHints.some((hint) => hasHint(item, hint))
  );

  return Array.from(
    new Map(
      [...preferred, ...fallbacks, ...remainder].map((item) => [item.id, item])
    ).values()
  ).sort(byScoreDesc);
}

function fillRail(
  target: HomeCandidate[],
  candidates: HomeCandidate[],
  usedIds: Set<string>,
  showAppearances: Map<string, number>,
  options: {
    limit: number;
    preferredHint: RailHint;
    fallbackHints?: RailHint[];
    predicate?: (item: HomeCandidate) => boolean;
  }
) {
  const { limit, preferredHint, fallbackHints = [], predicate } = options;

  if (target.length >= limit) return;

  const pool = buildPool(candidates, preferredHint, fallbackHints);

  for (const item of pool) {
    if (target.length >= limit) break;
    if (predicate && !predicate(item)) continue;
    if (!canUseItem(item, usedIds, showAppearances)) continue;

    target.push(item);
    markUsed(item, usedIds, showAppearances);
  }
}

function pickHero(candidates: HomeCandidate[]) {
  const sorted = [...candidates].sort(byScoreDesc);

  const strictHero =
    sorted.find((item) => hasHint(item, "hero") && isEligibleForHero(item)) ??
    null;

  if (strictHero) return strictHero;

  const strongPersonalRelevant =
    sorted.find(
      (item) =>
        isEligibleForHero(item) &&
        (item.relationship === "followed" || item.relationship === "recommended")
    ) ?? null;

  if (strongPersonalRelevant) return strongPersonalRelevant;

  const bestPersonal =
    sorted.find(
      (item) =>
        item.relationship === "followed" || item.relationship === "recommended"
    ) ?? null;

  if (bestPersonal) return bestPersonal;

  return sorted[0] ?? null;
}

export function assignRails(candidates: HomeCandidate[]): HomeExperience {
  const sorted = [...candidates].sort(byScoreDesc);

  const hero = pickHero(sorted);

  const startingSoon: HomeCandidate[] = [];
  const tonightPicks: HomeCandidate[] = [];
  const becauseYouFollow: HomeCandidate[] = [];
  const comingThisWeek: HomeCandidate[] = [];
  const comingSoon: HomeCandidate[] = [];

  const usedIds = new Set<string>();
  const showAppearances = new Map<string, number>();

  if (hero) {
    usedIds.add(hero.id);

    /**
     * Reserve the hero's show completely so the same show does not
     * immediately dominate multiple rails.
     */
    const heroShowKey = getShowKey(hero);
    if (heroShowKey) {
      showAppearances.set(heroShowKey, MAX_APPEARANCES_PER_SHOW);
    }
  }

  /**
   * Locked homepage supply order:
   * Hero -> Drops Tonight -> Starting Soon -> This Week -> Because You Follow -> Coming Soon
   */
  fillRail(tonightPicks, sorted, usedIds, showAppearances, {
    limit: MAX_TONIGHT_PICKS,
    preferredHint: "tonight_picks",
    predicate: (item) => isEligibleForTonight(item),
  });

  fillRail(startingSoon, sorted, usedIds, showAppearances, {
    limit: MAX_STARTING_SOON,
    preferredHint: "starting_soon",
    predicate: (item) => isEligibleForStartingSoon(item),
  });

  fillRail(comingThisWeek, sorted, usedIds, showAppearances, {
    limit: MAX_COMING_THIS_WEEK,
    preferredHint: "coming_this_week",
    predicate: (item) => isEligibleForComingThisWeek(item),
  });

  fillRail(becauseYouFollow, sorted, usedIds, showAppearances, {
    limit: MAX_BECAUSE_YOU_FOLLOW,
    preferredHint: "because_you_follow",
    predicate: (item) => isStrongBecauseYouFollowCandidate(item),
  });

  fillRail(comingSoon, sorted, usedIds, showAppearances, {
    limit: MAX_COMING_SOON,
    preferredHint: "coming_soon",
    predicate: (item) => isEligibleForComingSoon(item),
  });

  return {
    hero,

    // Existing internal rails
    startingSoon,
    tonightPicks,
    becauseYouFollow,
    comingThisWeek,

    // New beta/public taxonomy support
    comingSoon,

    /**
     * Public homepage aliases:
     * - dropsTonight = true imminent releases only
     * - thisWeek = near-term planning releases
     */
    dropsTonight: tonightPicks,
    thisWeek: comingThisWeek,
  };
}