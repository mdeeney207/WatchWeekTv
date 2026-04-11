// web/lib/home/normalizeSportsCandidate.ts

import { HomeCandidate, RailHint, ReleaseStatus } from "./types";

export type NormalizeSportsInput = {
  id: string;
  title?: string;

  sport?: string | null;
  leagueId?: string | null;
  leagueName?: string | null;
  tournamentId?: string | null;
  tournamentName?: string | null;

  homeTeamId?: string | null;
  homeTeamName: string;
  awayTeamId?: string | null;
  awayTeamName: string;

  provider?: string | null;
  providerSlug?: string | null;

  startsAtISO: string;

  posterUrl?: string;
  backdropUrl?: string;

  relationship?: "followed" | "trending" | "editorial";
  reason?:
    | "team_followed"
    | "tournament_followed"
    | "live_event"
    | "editorial_pick";
  source?: string;
};

function getReleaseStatus(startDate: Date | null): ReleaseStatus {
  if (!startDate || Number.isNaN(startDate.getTime())) return "upcoming";

  const diffMs = startDate.getTime() - Date.now();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours <= 0 && diffHours >= -3) {
    return "live_now";
  }

  if (diffHours > 0 && diffHours <= 2) {
    return "starting_soon";
  }

  if (diffHours > 2 && diffHours <= 24) {
    return "tonight";
  }

  if (diffHours > 24 && diffHours <= 48) {
    return "tomorrow";
  }

  if (diffHours > 48 && diffHours <= 24 * 7) {
    return "this_week";
  }

  return "upcoming";
}

function getUrgencyScore(status: ReleaseStatus): number {
  switch (status) {
    case "live_now":
      return 100;
    case "starting_soon":
      return 95;
    case "tonight":
      return 82;
    case "tomorrow":
      return 68;
    case "this_week":
      return 58;
    case "recently_dropped":
      return 70;
    case "upcoming":
    default:
      return 55;
  }
}

function getFreshnessScore(status: ReleaseStatus): number {
  switch (status) {
    case "live_now":
      return 100;
    case "starting_soon":
      return 94;
    case "tonight":
      return 86;
    case "tomorrow":
      return 72;
    case "this_week":
      return 64;
    case "recently_dropped":
      return 74;
    case "upcoming":
    default:
      return 50;
  }
}

function getDefaultRailHint(status: ReleaseStatus): HomeCandidate["railHint"] {
  if (status === "live_now") return "sports_live";
  return "sports_upcoming";
}

function getSourceRailHints(status: ReleaseStatus): RailHint[] {
  const hints = new Set<RailHint>();

  if (status === "live_now") {
    hints.add("sports_live");
    hints.add("hero");
    hints.add("tonight_picks");
  }

  if (status === "starting_soon" || status === "tonight") {
    hints.add("sports_upcoming");
    hints.add("tonight_picks");
  }

  if (status === "tomorrow" || status === "this_week") {
    hints.add("sports_upcoming");
  }

  if (status === "upcoming") {
    hints.add("sports_upcoming");
  }

  return Array.from(hints);
}

export function normalizeSportsCandidate(
  event: NormalizeSportsInput
): HomeCandidate {
  const startDate = event.startsAtISO ? new Date(event.startsAtISO) : null;
  const releaseStatus = getReleaseStatus(startDate);
  const urgencyScore = getUrgencyScore(releaseStatus);

  const title =
    event.title?.trim() || `${event.homeTeamName} vs ${event.awayTeamName}`;

  const relationship = event.relationship ?? "followed";
  const reason = event.reason ?? "live_event";
  const isWorldCup = Boolean(
    event.tournamentName?.toLowerCase().includes("world cup")
  );

  return {
    id: event.id,
    type: "sports_event",

    title,
    subtitle: event.tournamentName ?? event.leagueName ?? "Live Sports",

    posterUrl: event.posterUrl,
    backdropUrl: event.backdropUrl,

    provider: event.provider ?? null,
    providerSlug: event.providerSlug ?? null,

    releaseAt: event.startsAtISO,
    releaseStatus,

    relationship,
    reason,
    source: event.source ?? "sports_schedule",

    railHint: getDefaultRailHint(releaseStatus),
    sourceRailHints: getSourceRailHints(releaseStatus),

    urgencyScore,
    relevanceScore: relationship === "followed" ? 90 : 70,
    providerScore: event.provider ? 72 : 48,
    freshnessScore: getFreshnessScore(releaseStatus),
    priorityScore: isWorldCup ? 98 : 78,
    finalScore: 0,

    sport: event.sport ?? "soccer",
    leagueId: event.leagueId ?? null,
    leagueName: event.leagueName ?? null,
    tournamentId: event.tournamentId ?? null,
    tournamentName: event.tournamentName ?? null,
    homeTeamId: event.homeTeamId ?? null,
    homeTeamName: event.homeTeamName,
    awayTeamId: event.awayTeamId ?? null,
    awayTeamName: event.awayTeamName,

    meta: {
      isSports: true,
      isLiveEvent: releaseStatus === "live_now",
      isWorldCup,
    },
  };
}