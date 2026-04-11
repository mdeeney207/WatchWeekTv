type TmdbWatchProviderResponse = {
  id: number;
  results?: Record<string, any>;
};

export async function getTvWatchProviders(
  tmdbId: number,
  country: string
): Promise<TmdbWatchProviderResponse["results"][string] | null> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_TMDB_BASE_URL ?? "https://api.themoviedb.org/3"}/tv/${tmdbId}/watch/providers`,
    {
      headers: {
        Authorization: `Bearer ${process.env.TMDB_API_READ_TOKEN}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 60 * 60 * 12 },
    }
  );

  if (!res.ok) {
    throw new Error(`TMDB watch providers failed: ${res.status}`);
  }

  const json = (await res.json()) as TmdbWatchProviderResponse;
  const regionKey = String(country || "US").toUpperCase();

  return json.results?.[regionKey] ?? null;
}