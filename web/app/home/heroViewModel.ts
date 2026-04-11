import type { HomeCandidate } from "@/lib/home/types";
import type { FollowedShow } from "@/lib/home/selectHero";
import type { HeroViewModel } from "./types";
import {
  candidateToFollowedShow,
  resolveShowArtwork,
} from "@/lib/home/resolveArtwork";
import { isValidIsoDate } from "./utils";

export function getCandidateDate(candidate: HomeCandidate): Date | null {
  if (!candidate.releaseAt || !isValidIsoDate(candidate.releaseAt)) return null;
  const parsed = new Date(candidate.releaseAt);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toRouteId(
  ...values: Array<string | number | null | undefined>
): string | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return String(value);
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (/^\d+$/.test(trimmed)) return trimmed;
    }
  }

  return null;
}

function heroBadgeLabel(candidate: HomeCandidate | null): string {
  if (!candidate) return "Featured Tonight";
  if (
    candidate.releaseStatus === "live_now" ||
    candidate.releaseStatus === "starting_soon" ||
    candidate.releaseStatus === "tonight"
  ) {
    return "Tonight";
  }
  if (candidate.relationship === "followed") return "Because You Follow";
  if (candidate.relationship === "recommended") return "Recommended";
  if (candidate.relationship === "trending") return "Trending Now";
  return "Featured";
}

function heroDescription(
  candidate: HomeCandidate | null,
  show: FollowedShow | null
): string {
  if (!candidate || !show) {
    return "See what drops tonight, what starts soon, and what is next across the services you actually use.";
  }

  if (
    candidate.releaseStatus === "live_now" ||
    candidate.releaseStatus === "starting_soon" ||
    candidate.releaseStatus === "tonight"
  ) {
    return "The homepage should tell you what matters now without making you browse.";
  }

  if (candidate.relationship === "followed") {
    return "Built around the shows you follow, so the homepage answers what matters now instead of sending you into a content maze.";
  }

  if (candidate.relationship === "recommended") {
    return "A recommendation grounded in your watch habits and release timing, not filler.";
  }

  if (candidate.relationship === "trending") {
    return "Popular right now, filtered into a release-first homepage instead of a noisy browse feed.";
  }

  return `Keep ${show.title} front and center alongside the releases that matter next.`;
}

export function heroSupportLabel(mode: HeroViewModel["mode"]): string {
  switch (mode) {
    case "calendar":
      return "Home focus";
    case "followed":
      return "Up next";
    case "recommended":
      return "Recommended";
    case "trending":
      return "Trending";
    default:
      return "Featured";
  }
}

export function buildHeroViewModel(
  heroCandidate: HomeCandidate | null,
  fallbackCandidate: HomeCandidate | null,
  followed: FollowedShow[]
): HeroViewModel {
  const candidate = heroCandidate ?? fallbackCandidate;
  const show = candidate
    ? resolveShowArtwork(candidateToFollowedShow(candidate), followed)
    : null;
  const date = candidate ? getCandidateDate(candidate) : null;

  const title = candidate?.title ?? show?.title ?? "WatchWeek";
  const backgroundUrl = candidate?.backdropUrl ?? show?.backdropUrl ?? undefined;
  const posterUrl = candidate?.posterUrl ?? show?.posterUrl ?? undefined;

  const mode: HeroViewModel["mode"] =
    candidate?.relationship === "followed"
      ? "followed"
      : candidate?.relationship === "recommended"
        ? "recommended"
        : candidate?.relationship === "trending"
          ? "trending"
          : date
            ? "calendar"
            : "default";

  const routeId = toRouteId(
    candidate?.tmdbId,
    show?.tmdbId,
    candidate?.id,
    show?.id
  );

  return {
    title,
    description: heroDescription(candidate, show),
    badgeLabel: heroBadgeLabel(candidate),
    backgroundUrl,
    posterUrl,
    show,
    date,
    primaryHref: routeId ? `/tv/${routeId}` : "/calendar",
    primaryLabel: routeId ? "Open show" : "Open calendar",
    secondaryHref: "/calendar",
    secondaryLabel: "View calendar",
    mode,
  };
}