// src/lib/tmdbProviders.ts
const API_BASE = "https://api.themoviedb.org/3";

function getTmdbKey(): string {
  const k = process.env.EXPO_PUBLIC_TMDB_API_KEY;
  if (!k) {
    throw new Error(
      "TMDB key missing. Set EXPO_PUBLIC_TMDB_API_KEY in .env and restart: npx expo start -c"
    );
  }
  return k;
}

type WatchProvider = {
  provider_id: number;
  provider_name: string;
  logo_path?: string | null;
};

type WatchProvidersResponse = {
  id: number;
  results: Record<
    string,
    Partial<{
      flatrate: WatchProvider[];
      free: WatchProvider[];
      ads: WatchProvider[];
      rent: WatchProvider[];
      buy: WatchProvider[];
    }>
  >;
};

// Simple in-memory cache to avoid hammering TMDB while scrolling
const cache = new Map<number, { ts: number; names: string[] }>();
const CACHE_MS = 1000 * 60 * 60; // 1 hour

async function tmdbGet<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const key = getTmdbKey();
  const url = new URL(`${API_BASE}${path}`);
  url.searchParams.set("api_key", key);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`TMDB ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

function uniqByName(list: WatchProvider[]): WatchProvider[] {
  const seen = new Set<string>();
  const out: WatchProvider[] = [];
  for (const p of list) {
    const key = (p.provider_name || "").toLowerCase();
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

export async function tmdbGetTvWatchProviderNamesUS(tmdbId: number): Promise<string[]> {
  const now = Date.now();
  const cached = cache.get(tmdbId);
  if (cached && now - cached.ts < CACHE_MS) return cached.names;

  const json = await tmdbGet<WatchProvidersResponse>(`/tv/${tmdbId}/watch/providers`, {
    language: "en-US",
  });

  const us = json.results?.US;
  if (!us) {
    cache.set(tmdbId, { ts: now, names: [] });
    return [];
  }

  // Include all types so we don't miss providers (flatrate is the most important)
  const merged: WatchProvider[] = [
    ...(us.flatrate ?? []),
    ...(us.free ?? []),
    ...(us.ads ?? []),
    ...(us.rent ?? []),
    ...(us.buy ?? []),
  ];

  const uniq = uniqByName(merged);
  const names = uniq.map((p) => p.provider_name);

  cache.set(tmdbId, { ts: now, names });
  return names;
}

// Map TMDB provider names -> your streaming_services slugs
// (You can extend this anytime without breaking data.)
export function mapProviderNameToServiceSlug(providerName: string): string | null {
  const n = providerName.trim().toLowerCase();

  // common ones
  if (n === "netflix") return "netflix";
  if (n === "hulu") return "hulu";
  if (n === "disney plus" || n === "disney+") return "disney-plus";
  if (n === "max" || n === "hbo max") return "max";
  if (n === "peacock") return "peacock";
  if (n === "paramount plus" || n === "paramount+") return "paramount-plus";
  if (n === "apple tv plus" || n === "apple tv+") return "apple-tv-plus";
  if (n === "the roku channel") return "the-roku-channel";

  // Prime Video appears as this in TMDB
  if (n === "amazon prime video" || n === "prime video") return "prime-video";

  // fallback: unknown provider
  return null;
}
