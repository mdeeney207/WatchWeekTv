import type { HomeCandidate } from "@/lib/home/types";
import type { FollowedShow, TrendingItem } from "@/lib/home/selectHero";

function normalizeTitleKey(value?: string | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getUsableImageUrl(
  backdropUrl?: string | null,
  posterUrl?: string | null
): string | null {
  const backdrop = String(backdropUrl ?? "").trim();
  if (backdrop) return backdrop;

  const poster = String(posterUrl ?? "").trim();
  if (poster) return poster;

  return null;
}

export function resolveShowArtwork(
  show: FollowedShow | null,
  followed: FollowedShow[]
): FollowedShow | null {
  if (!show) return null;
  if (show.posterUrl || show.backdropUrl) return show;

  const showTitleKey = normalizeTitleKey(show.title);

  const fallback = followed.find((f) => {
    const sameId = f.id === show.id;
    const sameTmdb =
      typeof f.tmdbId === "number" &&
      typeof show.tmdbId === "number" &&
      f.tmdbId === show.tmdbId;
    const sameTitle = normalizeTitleKey(f.title) === showTitleKey;

    return sameTmdb || sameId || sameTitle;
  });

  if (!fallback) return show;

  return {
    ...show,
    posterUrl: show.posterUrl ?? fallback.posterUrl,
    backdropUrl: show.backdropUrl ?? fallback.backdropUrl,
    tmdbId: show.tmdbId ?? fallback.tmdbId ?? null,
    id: show.id || fallback.id,
    provider: show.provider || fallback.provider || "Streaming",
  };
}

export function candidateToFollowedShow(
  candidate: HomeCandidate
): FollowedShow | null {
  const resolvedId = String(candidate.showId ?? candidate.id ?? "").trim();
  if (!resolvedId || !candidate.title) return null;

  return {
    id: resolvedId,
    tmdbId: candidate.tmdbId ?? null,
    title: candidate.title,
    provider: "Streaming",
    posterUrl: candidate.posterUrl ?? undefined,
    backdropUrl: candidate.backdropUrl ?? undefined,
  };
}

function findTrendingArtworkFallback(
  candidate: HomeCandidate,
  trendingPool: TrendingItem[]
): TrendingItem | undefined {
  if (typeof candidate.tmdbId === "number") {
    const byTmdb = trendingPool.find(
      (item) =>
        typeof item.id === "number" &&
        item.id === candidate.tmdbId
    );

    if (byTmdb) return byTmdb;
  }

  const titleKey = normalizeTitleKey(candidate.title);
  if (!titleKey) return undefined;

  return trendingPool.find(
    (item) => normalizeTitleKey(item.title) === titleKey
  );
}

export function resolveCandidateArtwork(
  candidate: HomeCandidate,
  followed: FollowedShow[],
  trendingPool: TrendingItem[]
): HomeCandidate {
  const resolvedShow = resolveShowArtwork(
    candidateToFollowedShow(candidate),
    followed
  );

  const trendingFallback = findTrendingArtworkFallback(candidate, trendingPool);

  return {
    ...candidate,
    showId: candidate.showId ?? resolvedShow?.id ?? candidate.id,
    tmdbId: candidate.tmdbId ?? resolvedShow?.tmdbId ?? null,
    posterUrl:
      candidate.posterUrl ??
      resolvedShow?.posterUrl ??
      trendingFallback?.posterUrl ??
      undefined,
    backdropUrl:
      candidate.backdropUrl ??
      resolvedShow?.backdropUrl ??
      trendingFallback?.backdropUrl ??
      undefined,
  };
}