// web/lib/home/scoreCandidate.ts

import { HomeCandidate } from "./types";

function isTimeVerified(item: HomeCandidate) {
  return Boolean(item.meta?.isTimeVerified) && Boolean(item.releaseAt);
}

function relationshipBoost(item: HomeCandidate) {
  switch (item.relationship) {
    case "followed":
      return 1.18;
    case "recommended":
      return 1.08;
    case "trending":
      return 0.98;
    case "provider_affinity":
      return 1.03;
    case "editorial":
      return 1.02;
    default:
      return 1;
  }
}

function releaseBoost(item: HomeCandidate) {
  switch (item.releaseStatus) {
    case "live_now":
      return 1.28;
    case "starting_soon":
      return 1.2;
    case "tonight":
      return 1.1;
    case "tomorrow":
      return 1.03;
    case "this_week":
      return 1;
    case "recently_dropped":
      return 1.02;
    case "upcoming":
    default:
      return 0.97;
  }
}

function heroHintBoost(item: HomeCandidate) {
  if (item.sourceRailHints?.includes("hero")) {
    return 1.08;
  }
  return 1;
}

function typeBoost(item: HomeCandidate) {
  switch (item.type) {
    case "sports_event":
      return 1.12;
    case "movie":
      return 1.01;
    case "episode":
      return 1.05;
    case "show":
      return 0.98;
    default:
      return 1;
  }
}

function reasonBoost(item: HomeCandidate) {
  switch (item.reason) {
    case "because_you_follow":
      return 1.09;
    case "similar_to_followed":
      return 1.05;
    case "live_event":
      return 1.12;
    case "team_followed":
      return 1.14;
    case "tournament_followed":
      return 1.16;
    case "editorial_pick":
      return 1.03;
    case "trending_now":
      return 1;
    case "new_release":
      return 1.03;
    default:
      return 1;
  }
}

function worldCupBoost(item: HomeCandidate) {
  const tournamentName = String(item.tournamentName ?? "").toLowerCase();
  const title = String(item.title ?? "").toLowerCase();
  const subtitle = String(item.subtitle ?? "").toLowerCase();

  if (
    tournamentName.includes("world cup") ||
    title.includes("world cup") ||
    subtitle.includes("world cup")
  ) {
    return 1.18;
  }

  return 1;
}

function sportsFollowBoost(item: HomeCandidate) {
  if (item.type !== "sports_event") return 1;

  if (item.reason === "team_followed") return 1.08;
  if (item.reason === "tournament_followed") return 1.1;

  return 1;
}

function timeVerifiedBoost(item: HomeCandidate) {
  if (!isTimeVerified(item)) return 1;

  switch (item.releaseStatus) {
    case "live_now":
      return 1.18;
    case "starting_soon":
      return 1.15;
    case "tonight":
      return 1.11;
    case "tomorrow":
      return 1.05;
    case "this_week":
      return 1.03;
    case "recently_dropped":
      return 1.02;
    case "upcoming":
    default:
      return 1.02;
  }
}

function discoveryOnlyPenalty(item: HomeCandidate) {
  if (isTimeVerified(item)) return 1;

  /**
   * Important:
   * - Trending discovery should be penalized the most.
   * - Recommended should be penalized a little.
   * - Followed library items should remain strong enough to power
   *   Because You Follow even without verified scheduling.
   */
  switch (item.relationship) {
    case "trending":
      return 0.9;
    case "recommended":
      return 0.95;
    case "followed":
      return 0.99;
    default:
      return 1;
  }
}

function seededRecommendationBoost(item: HomeCandidate) {
  if (item.relationship !== "recommended") return 1;
  return item.seedShowId ? 1.04 : 0.98;
}

function computeBaseScore(item: HomeCandidate) {
  let score = 0;

  score += (item.urgencyScore ?? 0) * 0.35;
  score += (item.relevanceScore ?? 0) * 0.35;
  score += (item.providerScore ?? 0) * 0.1;
  score += (item.freshnessScore ?? 0) * 0.2;

  return score;
}

export function computeGlobalScore(item: HomeCandidate) {
  const base = computeBaseScore(item);

  const relationship = relationshipBoost(item);
  const release = releaseBoost(item);
  const hero = heroHintBoost(item);
  const type = typeBoost(item);
  const reason = reasonBoost(item);
  const worldCup = worldCupBoost(item);
  const sportsFollow = sportsFollowBoost(item);
  const timed = timeVerifiedBoost(item);
  const discoveryPenalty = discoveryOnlyPenalty(item);
  const seededRecommendation = seededRecommendationBoost(item);

  return (
    Math.round(
      base *
        relationship *
        release *
        hero *
        type *
        reason *
        worldCup *
        sportsFollow *
        timed *
        discoveryPenalty *
        seededRecommendation *
        100
    ) / 100
  );
}

export function applyScore(item: HomeCandidate): HomeCandidate {
  return {
    ...item,
    finalScore: computeGlobalScore(item),
  };
}