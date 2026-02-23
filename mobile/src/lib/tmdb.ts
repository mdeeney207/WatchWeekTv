// mobile/src/lib/tmdb.ts
import { supabase } from "./supabase";

export type TmdbSearchTvResult = {
  id: number;
  name: string;
  first_air_date?: string;
  poster_path?: string | null;
  overview?: string;
};

export function tmdbPosterUrl(
  path: string | null | undefined,
  size: "w92" | "w185" | "w342" | "w500" | "original" = "w185"
) {
  if (!path) return null;
  const p = String(path).trim();
  if (!p) return null;

  // allow full urls too
  if (p.startsWith("http://") || p.startsWith("https://")) return p;

  // tmdb path
  if (p.startsWith("/")) return `https://image.tmdb.org/t/p/${size}${p}`;

  return null;
}

type FnErrorShape = {
  message?: string;
  status?: number;
  name?: string;
  context?: any;
  details?: any;
};

const DEBUG_TMDB = false; // ✅ pre-beta: keep quiet by default

function safeStringify(v: any, maxChars = 1200) {
  try {
    const s = JSON.stringify(v, null, 2);
    return s.length > maxChars ? s.slice(0, maxChars) + "…" : s;
  } catch {
    return "[unstringifiable]";
  }
}

function normalizePayload(payload: any): any {
  // Supabase Edge Functions can sometimes return a JSON string
  if (typeof payload === "string") {
    try {
      return JSON.parse(payload);
    } catch {
      return payload;
    }
  }
  return payload;
}

/**
 * Calls tmdb_proxy and returns payload.
 * Throws on any error (NO silent fallbacks).
 */
async function tmdbProxy<T>(body: Record<string, any>): Promise<T> {
  if (__DEV__ && DEBUG_TMDB) console.log("[tmdb_proxy] invoke body:", safeStringify(body, 600));

  const { data, error } = await supabase.functions.invoke("tmdb_proxy", { body });

  if (error) {
    const e = error as unknown as FnErrorShape;
    if (__DEV__) console.log("[tmdb_proxy] invoke error:", safeStringify(e));
    throw new Error(e?.message ?? "tmdb_proxy invoke failed");
  }

  if (data === null || data === undefined) {
    throw new Error("tmdb_proxy returned no data");
  }

  const normalized = normalizePayload(data);

  // some functions return { error: "..."} inside data
  if (normalized && typeof normalized === "object" && (normalized as any).error) {
    throw new Error(String((normalized as any).error));
  }

  return normalized as T;
}

function extractResultsArray(payload: any): any[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;

  // common shapes
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.data?.results)) return payload.data.results;
  if (Array.isArray(payload.data?.data?.results)) return payload.data.data.results;

  // sometimes nested deeper
  if (Array.isArray(payload?.tmdb?.results)) return payload.tmdb.results;

  return [];
}

function normalizeTvResult(x: any): TmdbSearchTvResult | null {
  const id = Number(x?.id);
  const name = String(x?.name ?? x?.original_name ?? "").trim();
  if (!Number.isFinite(id) || !name) return null;

  return {
    id,
    name,
    first_air_date: x?.first_air_date ?? x?.first_air_time ?? undefined,
    poster_path: x?.poster_path ?? null,
    overview: x?.overview ?? undefined,
  };
}

export type TmdbWatchProvider = {
  provider_id: number;
  provider_name: string;
  logo_path?: string | null;
  display_priority?: number;
};

export type TmdbWatchProvidersRegion = {
  link?: string;
  flatrate?: TmdbWatchProvider[];
  ads?: TmdbWatchProvider[];
  free?: TmdbWatchProvider[];
  rent?: TmdbWatchProvider[];
  buy?: TmdbWatchProvider[];
};

export type TmdbWatchProvidersResponse = {
  id: number;
  results?: Record<string, TmdbWatchProvidersRegion>;
};

/**
 * TV search.
 * IMPORTANT: supports both server contracts:
 * - { action: "search_tv", query }
 * - { op: "search_tv", query }
 *
 * Throws on failure so the UI shows a real error.
 */
export async function tmdbSearchTv(query: string): Promise<TmdbSearchTvResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  // Try "action" contract first (your current code)
  let raw: any;
  let lastErr: any = null;

  try {
    raw = await tmdbProxy<any>({ action: "search_tv", query: q });
  } catch (e) {
    lastErr = e;
    raw = null;
  }

  if (raw == null) {
    try {
      raw = await tmdbProxy<any>({ op: "search_tv", query: q });
    } catch (e2) {
      lastErr = e2;
      throw new Error(
        `TMDB search failed. tmdb_proxy contract mismatch or server error. Last error: ${
          (lastErr as any)?.message ?? String(lastErr)
        }`
      );
    }
  }

  if (__DEV__ && DEBUG_TMDB) {
    console.log("[tmdbSearchTv] query:", q);
    console.log("[tmdbSearchTv] raw:", safeStringify(raw));
    console.log("[tmdbSearchTv] rawKeys:", Object.keys(raw ?? {}));
  }

  const arr = extractResultsArray(raw);

  const normalized = arr.map(normalizeTvResult).filter(Boolean) as TmdbSearchTvResult[];

  if (__DEV__ && DEBUG_TMDB) {
    console.log("[tmdbSearchTv] results:", normalized.length);
    if (normalized[0]) console.log("[tmdbSearchTv] first:", normalized[0].id, normalized[0].name);
  }

  return normalized;
}

/**
 * Details/Season calls: also support both contracts.
 */
export async function tmdbGetTvDetails(tmdbId: number) {
  if (!tmdbId) throw new Error("tmdbGetTvDetails: missing tmdbId");

  try {
    return await tmdbProxy({ action: "tv_details", tmdbId });
  } catch {
    return await tmdbProxy({ op: "tv_details", tmdbId });
  }
}

export async function tmdbGetSeason(tmdbId: number, seasonNumber: number) {
  if (!tmdbId) throw new Error("tmdbGetSeason: missing tmdbId");
  if (seasonNumber === undefined || seasonNumber === null) {
    throw new Error("tmdbGetSeason: missing seasonNumber");
  }

  try {
    return await tmdbProxy({ action: "tv_season", tmdbId, seasonNumber });
  } catch {
    return await tmdbProxy({ op: "tv_season", tmdbId, seasonNumber });
  }
}

/**
 * Watch providers (where a show is available).
 * Uses tmdb_proxy, supports both contracts:
 * - { action: "tv_watch_providers", tmdbId }
 * - { op: "tv_watch_providers", tmdbId }
 *
 * NOTE: Your Edge Function must implement this op/action by calling:
 * GET /tv/{tmdbId}/watch/providers
 */
export async function tmdbGetTvWatchProviders(tmdbId: number): Promise<TmdbWatchProvidersResponse> {
  if (!tmdbId) throw new Error("tmdbGetTvWatchProviders: missing tmdbId");

  try {
    return await tmdbProxy<TmdbWatchProvidersResponse>({ action: "tv_watch_providers", tmdbId });
  } catch {
    return await tmdbProxy<TmdbWatchProvidersResponse>({ op: "tv_watch_providers", tmdbId });
  }
}

/**
 * Helper: pick best providers list for a region (default US).
 * Preference order: flatrate → ads → free → rent → buy
 */
export function tmdbPickProvidersForRegion(
  payload: TmdbWatchProvidersResponse,
  region = "US"
): { region: string; providers: TmdbWatchProvider[]; link?: string } {
  const results = payload?.results ?? {};
  const r: TmdbWatchProvidersRegion | undefined = (results as any)[region] ?? undefined;

  if (!r) return { region, providers: [], link: undefined };

  const providers =
    r.flatrate ??
    r.ads ??
    r.free ??
    r.rent ??
    r.buy ??
    [];

  return { region, providers: providers ?? [], link: r.link };
}
