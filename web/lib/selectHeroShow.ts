import { tmdbPosterUrl, tmdbBackdropUrl } from "@/lib/tmdb";

function hasArtwork(show: any) {
  return Boolean(show?.backdrop_path || show?.poster_path);
}

export function selectHeroShow(shows: any[]) {
  const now = new Date();

  const sorted = shows
    .filter((s) => s.air_date_utc)
    .sort(
      (a, b) =>
        new Date(a.air_date_utc).getTime() -
        new Date(b.air_date_utc).getTime()
    );

  if (sorted.length === 0) return null;

  const next =
    sorted.find((s) => hasArtwork(s)) ??
    sorted[0];

  const air = new Date(next.air_date_utc);
  const diff = air.getTime() - now.getTime();

  const posterUrl = tmdbPosterUrl(next.poster_path, "w342");
  const backdropUrl = tmdbBackdropUrl(next.backdrop_path, "w1280");
  const backgroundUrl = backdropUrl ?? posterUrl ?? null;

  return {
    ...next,
    posterUrl,
    backgroundUrl,
    urgency:
      diff < 0
        ? "now"
        : diff < 6 * 60 * 60 * 1000
          ? "tonight"
          : diff < 24 * 60 * 60 * 1000
            ? "tomorrow"
            : "soon",
  };
}