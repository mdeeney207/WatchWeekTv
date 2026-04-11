const WATCHMODE_API_KEY = process.env.WATCHMODE_API_KEY ?? "";

if (!WATCHMODE_API_KEY) {
  throw new Error("WATCHMODE_API_KEY is not set");
}

type WatchmodeSearchResponse = {
  title_results?: Array<{
    id: number;
    name?: string;
    title?: string;
    tmdb_id?: number | null;
    type?: string;
    year?: number | null;
  }>;
};

export type WatchmodeSource = {
  source_id?: number;
  name?: string;
  type?: string;
  region?: string;
  web_url?: string | null;
  ios_url?: string | null;
  android_url?: string | null;
  format?: string;
  price?: number | null;
  seasons?: number | null;
  episodes?: number | null;
};

async function watchmodeGet(path: string) {
  const url = new URL(`https://api.watchmode.com${path}`);
  url.searchParams.set("apiKey", WATCHMODE_API_KEY);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Watchmode ${res.status}: ${text}`);
  }

  return res.json();
}

export async function findWatchmodeTitleByTmdb(tmdbId: number) {
  const data = (await watchmodeGet(
    `/v1/search/?search_field=tmdb_tv_id&search_value=${tmdbId}&types=tv`
  )) as WatchmodeSearchResponse;

  return data.title_results?.[0] ?? null;
}

export async function getWatchmodeSources(
  watchmodeTitleId: number,
  region = "US"
) {
  return (await watchmodeGet(
    `/v1/title/${watchmodeTitleId}/sources/?regions=${region}`
  )) as WatchmodeSource[];
}