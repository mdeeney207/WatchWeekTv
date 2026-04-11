export type TmdbSearchTvResult = {
  id: number;
  name: string;
  first_air_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string;
  vote_average?: number | null;
};

export type TmdbTvDetails = {
  id: number;
  name: string;
  original_name?: string;
  overview?: string | null;

  first_air_date?: string | null;
  last_air_date?: string | null;

  poster_path?: string | null;
  backdrop_path?: string | null;

  tagline?: string | null;
  status?: string | null;

  number_of_seasons?: number | null;
  number_of_episodes?: number | null;

  vote_average?: number | null;
  vote_count?: number | null;

  genres?: Array<{ id: number; name: string }>;
  homepage?: string | null;

  next_episode_to_air?: {
    air_date?: string | null;
    episode_number?: number | null;
    season_number?: number | null;
    name?: string | null;
    overview?: string | null;
  } | null;

  seasons?:
    | Array<{
        air_date?: string | null;
        episode_count?: number | null;
        season_number?: number | null;
        name?: string | null;
        overview?: string | null;
        poster_path?: string | null;
      }>
    | null;
};

export type TmdbTrendingTvResult = {
  id: number;
  title: string;
  posterUrl?: string;
  backdropUrl?: string;
  overview?: string;
  voteAverage?: number | null;
  firstAirDate?: string;
};

export type TmdbMovieResult = {
  id: number;
  title: string;
  original_title?: string;
  release_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  overview?: string;
  vote_average?: number | null;
};

export type TmdbTrendingMovieResult = {
  id: number;
  title: string;
  posterUrl?: string;
  backdropUrl?: string;
  overview?: string;
  voteAverage?: number | null;
  releaseDate?: string;
};

const TMDB_WATCH_PROVIDER_IDS: Record<string, number> = {
  netflix: 8,
  "prime-video": 9,
  hulu: 15,
  "disney-plus": 337,
  "apple-tv-plus": 350,
  peacock: 386,
  "paramount-plus": 531,
  max: 1899,
};

export function tmdbPosterUrl(
  path: string | null | undefined,
  size: "w92" | "w185" | "w342" | "w500" | "original" = "w185"
) {
  if (!path) return null;
  const p = String(path).trim();
  if (!p) return null;

  if (p.startsWith("http://") || p.startsWith("https://")) return p;
  if (p.startsWith("/")) return `https://image.tmdb.org/t/p/${size}${p}`;
  return null;
}

export function tmdbBackdropUrl(
  path: string | null | undefined,
  size: "w780" | "w1280" | "original" = "w1280"
) {
  if (!path) return null;
  const p = String(path).trim();
  if (!p) return null;

  if (p.startsWith("http://") || p.startsWith("https://")) return p;
  if (p.startsWith("/")) return `https://image.tmdb.org/t/p/${size}${p}`;
  return null;
}

const DEBUG_TMDB = false;
const IS_DEV = process.env.NODE_ENV !== "production";

function safeStringify(v: unknown, maxChars = 1200) {
  try {
    const s = JSON.stringify(v, null, 2);
    return s.length > maxChars ? s.slice(0, maxChars) + "…" : s;
  } catch {
    return "[unstringifiable]";
  }
}

function normalizePayload(payload: unknown): any {
  if (typeof payload === "string") {
    try {
      return JSON.parse(payload);
    } catch {
      return payload;
    }
  }
  return payload;
}

function extractResultsArray(payload: any): any[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.data?.results)) return payload.data.results;
  if (Array.isArray(payload.data?.data?.results)) return payload.data.data.results;
  if (Array.isArray(payload.tmdb?.results)) return payload.tmdb.results;
  return [];
}

function clampLimit(limit: number, fallback = 12) {
  return Number.isFinite(limit) ? Math.max(1, Math.min(24, limit)) : fallback;
}

function normalizeRegion(region?: string) {
  const safeRegion = String(region || "US").trim().toUpperCase();
  return safeRegion || "US";
}

function normalizePath(path: string) {
  const trimmed = String(path || "").trim();
  if (!trimmed) {
    throw new Error("TMDB path is required.");
  }

  return trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;
}

function buildQueryString(
  params: Record<string, string | number | boolean | null | undefined>
) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue;
    const normalized = String(value).trim();
    if (!normalized) continue;
    search.set(key, normalized);
  }

  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

function makeTmdbPath(
  basePath: string,
  params?: Record<string, string | number | boolean | null | undefined>
) {
  const normalizedBase = normalizePath(basePath);
  return `${normalizedBase}${params ? buildQueryString(params) : ""}`;
}

function normalizeTvResult(x: any): TmdbSearchTvResult | null {
  const id = Number(x?.id);
  const name = String(x?.name ?? x?.original_name ?? "").trim();
  if (!Number.isFinite(id) || !name) return null;

  return {
    id,
    name,
    first_air_date: x?.first_air_date ?? undefined,
    poster_path: x?.poster_path ?? null,
    backdrop_path: x?.backdrop_path ?? null,
    overview: x?.overview ?? undefined,
    vote_average: typeof x?.vote_average === "number" ? x.vote_average : null,
  };
}

function normalizeTrendingTvResult(x: any): TmdbTrendingTvResult | null {
  const normalized = normalizeTvResult(x);
  if (!normalized) return null;

  return {
    id: normalized.id,
    title: normalized.name,
    posterUrl: tmdbPosterUrl(normalized.poster_path, "w342") ?? undefined,
    backdropUrl:
      tmdbBackdropUrl(normalized.backdrop_path, "w1280") ??
      tmdbPosterUrl(normalized.poster_path, "w500") ??
      undefined,
    overview: normalized.overview,
    voteAverage: normalized.vote_average ?? null,
    firstAirDate: normalized.first_air_date,
  };
}

function normalizeTvDetails(x: any): TmdbTvDetails | null {
  const id = Number(x?.id);
  const name = String(x?.name ?? x?.original_name ?? "").trim();
  if (!Number.isFinite(id) || !name) return null;

  return {
    id,
    name,
    original_name: x?.original_name ?? undefined,
    overview: x?.overview ?? null,

    first_air_date: x?.first_air_date ?? null,
    last_air_date: x?.last_air_date ?? null,

    poster_path: x?.poster_path ?? null,
    backdrop_path: x?.backdrop_path ?? null,

    tagline: x?.tagline ?? null,
    status: x?.status ?? null,

    number_of_seasons:
      typeof x?.number_of_seasons === "number" ? x.number_of_seasons : null,
    number_of_episodes:
      typeof x?.number_of_episodes === "number" ? x.number_of_episodes : null,

    vote_average: typeof x?.vote_average === "number" ? x.vote_average : null,
    vote_count: typeof x?.vote_count === "number" ? x.vote_count : null,

    genres: Array.isArray(x?.genres) ? x.genres : undefined,
    homepage: x?.homepage ?? null,

    next_episode_to_air: x?.next_episode_to_air
      ? {
          air_date: x.next_episode_to_air?.air_date ?? null,
          episode_number:
            typeof x.next_episode_to_air?.episode_number === "number"
              ? x.next_episode_to_air.episode_number
              : null,
          season_number:
            typeof x.next_episode_to_air?.season_number === "number"
              ? x.next_episode_to_air.season_number
              : null,
          name: x.next_episode_to_air?.name ?? null,
          overview: x.next_episode_to_air?.overview ?? null,
        }
      : null,

    seasons: Array.isArray(x?.seasons)
      ? x.seasons.map((season: any) => ({
          air_date: season?.air_date ?? null,
          episode_count:
            typeof season?.episode_count === "number"
              ? season.episode_count
              : null,
          season_number:
            typeof season?.season_number === "number"
              ? season.season_number
              : null,
          name: season?.name ?? null,
          overview: season?.overview ?? null,
          poster_path: season?.poster_path ?? null,
        }))
      : null,
  };
}

function normalizeMovieResult(x: any): TmdbMovieResult | null {
  const id = Number(x?.id);
  const title = String(x?.title ?? x?.original_title ?? "").trim();
  if (!Number.isFinite(id) || !title) return null;

  return {
    id,
    title,
    original_title: x?.original_title ?? undefined,
    release_date: x?.release_date ?? undefined,
    poster_path: x?.poster_path ?? null,
    backdrop_path: x?.backdrop_path ?? null,
    overview: x?.overview ?? undefined,
    vote_average: typeof x?.vote_average === "number" ? x.vote_average : null,
  };
}

function normalizeTrendingMovieResult(x: any): TmdbTrendingMovieResult | null {
  const normalized = normalizeMovieResult(x);
  if (!normalized) return null;

  return {
    id: normalized.id,
    title: normalized.title,
    posterUrl: tmdbPosterUrl(normalized.poster_path, "w342") ?? undefined,
    backdropUrl:
      tmdbBackdropUrl(normalized.backdrop_path, "w1280") ??
      tmdbPosterUrl(normalized.poster_path, "w500") ??
      undefined,
    overview: normalized.overview,
    voteAverage: normalized.vote_average ?? null,
    releaseDate: normalized.release_date,
  };
}

function dedupeById<T extends { id: number }>(items: T[]): T[] {
  const seen = new Set<number>();
  const out: T[] = [];

  for (const item of items) {
    if (!Number.isFinite(item.id)) continue;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }

  return out;
}

async function tmdbProxy<T>(body: { path: string }): Promise<T> {
  const safeBody = { path: normalizePath(body.path) };

  if (IS_DEV && DEBUG_TMDB) {
    console.log("[tmdb_proxy] request body:", safeStringify(safeBody, 600));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY for tmdb_proxy call."
    );
  }

  const url = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/tmdb_proxy`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: anonKey,
      authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify(safeBody),
    cache: "no-store",
  });

  const text = await res.text();
  let json: any = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }

  if (!res.ok) {
    if (IS_DEV) {
      console.log("[tmdb_proxy] non-200:", res.status, safeStringify(json));
    }
    throw new Error(`tmdb_proxy failed (${res.status})`);
  }

  if (json === null || json === undefined || json === "") {
    throw new Error("tmdb_proxy returned empty body");
  }

  const normalized = normalizePayload(json);

  if (normalized && typeof normalized === "object" && normalized.error) {
    throw new Error(String(normalized.error));
  }

  return normalized as T;
}

async function tmdbProxyPath<T>(path: string): Promise<T> {
  return tmdbProxy<T>({ path: normalizePath(path) });
}

export async function tmdbSearchTv(query: string): Promise<TmdbSearchTvResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  try {
    const raw = await tmdbProxyPath<any>(
      makeTmdbPath("search/tv", {
        query: q,
        language: "en-US",
        page: 1,
        include_adult: false,
      })
    );

    const arr = extractResultsArray(raw);

    return dedupeById(
      arr.map(normalizeTvResult).filter(Boolean) as TmdbSearchTvResult[]
    );
  } catch (error) {
    if (IS_DEV) {
      console.log(
        "[tmdbSearchTv] failed:",
        (error as any)?.message ?? String(error)
      );
    }
    return [];
  }
}

export async function tmdbGetTrendingTv(
  limit = 12,
  timeWindow: "day" | "week" = "day"
): Promise<TmdbTrendingTvResult[]> {
  const safeLimit = clampLimit(limit, 12);
  const safeWindow = timeWindow === "week" ? "week" : "day";

  try {
    const raw = await tmdbProxyPath<any>(
      makeTmdbPath(`trending/tv/${safeWindow}`, {
        language: "en-US",
      })
    );

    const arr = extractResultsArray(raw);
    if (!arr.length) return [];

    const normalized = dedupeById(
      arr
        .map(normalizeTrendingTvResult)
        .filter(Boolean)
        .filter(
          (item): item is TmdbTrendingTvResult =>
            Boolean(item) && Boolean(item.title)
        )
    );

    const withArtwork = normalized.filter(
      (item) => item.posterUrl || item.backdropUrl
    );

    if (withArtwork.length) return withArtwork.slice(0, safeLimit);
    return normalized.slice(0, safeLimit);
  } catch (error) {
    if (IS_DEV) {
      console.log(
        "[tmdbGetTrendingTv] failed for timeWindow:",
        safeWindow,
        "error:",
        (error as any)?.message ?? String(error)
      );
    }
    return [];
  }
}

export async function tmdbGetTrendingMovies(
  limit = 12,
  timeWindow: "day" | "week" = "week"
): Promise<TmdbTrendingMovieResult[]> {
  const safeLimit = clampLimit(limit, 12);
  const safeWindow = timeWindow === "day" ? "day" : "week";

  try {
    const raw = await tmdbProxyPath<any>(
      makeTmdbPath(`trending/movie/${safeWindow}`, {
        language: "en-US",
      })
    );

    const arr = extractResultsArray(raw);
    if (!arr.length) return [];

    const normalized = dedupeById(
      arr
        .map(normalizeTrendingMovieResult)
        .filter(Boolean)
        .filter(
          (item): item is TmdbTrendingMovieResult =>
            Boolean(item) && Boolean(item.title)
        )
    );

    const withArtwork = normalized.filter(
      (item) => item.posterUrl || item.backdropUrl
    );

    if (withArtwork.length) return withArtwork.slice(0, safeLimit);
    return normalized.slice(0, safeLimit);
  } catch (error) {
    if (IS_DEV) {
      console.log(
        "[tmdbGetTrendingMovies] failed for timeWindow:",
        safeWindow,
        "error:",
        (error as any)?.message ?? String(error)
      );
    }
    return [];
  }
}

export async function tmdbGetUpcomingMovies(
  limit = 12
): Promise<TmdbMovieResult[]> {
  const safeLimit = clampLimit(limit, 12);

  try {
    const raw = await tmdbProxyPath<any>(
      makeTmdbPath("movie/upcoming", {
        language: "en-US",
        page: 1,
      })
    );

    const arr = extractResultsArray(raw);
    if (!arr.length) return [];

    const normalized = dedupeById(
      arr.map(normalizeMovieResult).filter(Boolean) as TmdbMovieResult[]
    );

    return normalized.slice(0, safeLimit);
  } catch (error) {
    if (IS_DEV) {
      console.log(
        "[tmdbGetUpcomingMovies] failed:",
        (error as any)?.message ?? String(error)
      );
    }
    return [];
  }
}

export async function tmdbDiscoverTvByProvider(
  providerSlug: string,
  region = "US",
  limit = 12
): Promise<TmdbTrendingTvResult[]> {
  const providerId = TMDB_WATCH_PROVIDER_IDS[providerSlug];
  if (!providerId) return [];

  const safeLimit = clampLimit(limit, 12);
  const safeRegion = normalizeRegion(region);

  try {
    const raw = await tmdbProxyPath<any>(
      makeTmdbPath("discover/tv", {
        language: "en-US",
        sort_by: "popularity.desc",
        watch_region: safeRegion,
        with_watch_providers: providerId,
        with_watch_monetization_types: "flatrate",
        page: 1,
      })
    );

    const arr = extractResultsArray(raw);
    if (!arr.length) return [];

    const normalized = dedupeById(
      arr
        .map(normalizeTrendingTvResult)
        .filter(Boolean)
        .filter(
          (item): item is TmdbTrendingTvResult =>
            Boolean(item) && Boolean(item.title)
        )
    );

    const withArtwork = normalized.filter(
      (item) => item.posterUrl || item.backdropUrl
    );

    if (withArtwork.length) return withArtwork.slice(0, safeLimit);
    return normalized.slice(0, safeLimit);
  } catch (error) {
    if (IS_DEV) {
      console.log(
        "[tmdbDiscoverTvByProvider] failed for provider:",
        providerSlug,
        "region:",
        safeRegion,
        "error:",
        (error as any)?.message ?? String(error)
      );
    }
    return [];
  }
}

export async function tmdbDiscoverMoviesByProvider(
  providerSlug: string,
  region = "US",
  limit = 12
): Promise<TmdbTrendingMovieResult[]> {
  const providerId = TMDB_WATCH_PROVIDER_IDS[providerSlug];
  if (!providerId) return [];

  const safeLimit = clampLimit(limit, 12);
  const safeRegion = normalizeRegion(region);

  try {
    const raw = await tmdbProxyPath<any>(
      makeTmdbPath("discover/movie", {
        language: "en-US",
        sort_by: "popularity.desc",
        watch_region: safeRegion,
        with_watch_providers: providerId,
        with_watch_monetization_types: "flatrate",
        page: 1,
      })
    );

    const arr = extractResultsArray(raw);
    if (!arr.length) return [];

    const normalized = dedupeById(
      arr
        .map(normalizeTrendingMovieResult)
        .filter(Boolean)
        .filter(
          (item): item is TmdbTrendingMovieResult =>
            Boolean(item) && Boolean(item.title)
        )
    );

    const withArtwork = normalized.filter(
      (item) => item.posterUrl || item.backdropUrl
    );

    if (withArtwork.length) return withArtwork.slice(0, safeLimit);
    return normalized.slice(0, safeLimit);
  } catch (error) {
    if (IS_DEV) {
      console.log(
        "[tmdbDiscoverMoviesByProvider] failed for provider:",
        providerSlug,
        "region:",
        safeRegion,
        "error:",
        (error as any)?.message ?? String(error)
      );
    }
    return [];
  }
}

export async function tmdbGetTvDetails(
  tmdbId: string | number
): Promise<TmdbTvDetails | null> {
  const tmdbIdStr = String(tmdbId).trim();
  if (!tmdbIdStr) return null;

  try {
    const raw = await tmdbProxyPath<any>(
      makeTmdbPath(`tv/${tmdbIdStr}`, {
        language: "en-US",
      })
    );

    const candidate =
      raw?.data?.tv ??
      raw?.data ??
      raw?.tv ??
      raw?.tmdb ??
      raw?.result ??
      raw;

    return normalizeTvDetails(candidate);
  } catch (error) {
    if (IS_DEV) {
      console.log(
        "[tmdbGetTvDetails] failed for tmdbId:",
        tmdbIdStr,
        "error:",
        (error as any)?.message ?? String(error)
      );
    }
    return null;
  }
}

export async function tmdbGetTvRecommendations(
  tmdbId: string | number,
  limit = 12
): Promise<TmdbSearchTvResult[]> {
  const tmdbIdStr = String(tmdbId).trim();
  if (!tmdbIdStr) return [];

  const safeLimit = clampLimit(limit, 12);

  try {
    const raw = await tmdbProxyPath<any>(
      makeTmdbPath(`tv/${tmdbIdStr}/recommendations`, {
        language: "en-US",
        page: 1,
      })
    );

    const arr = extractResultsArray(raw);
    if (!arr.length) return [];

    const normalized = dedupeById(
      arr
        .map(normalizeTvResult)
        .filter(Boolean)
        .filter((item) => item!.id !== Number(tmdbIdStr)) as TmdbSearchTvResult[]
    );

    return normalized.slice(0, safeLimit);
  } catch (error) {
    if (IS_DEV) {
      console.log(
        "[tmdbGetTvRecommendations] failed for tmdbId:",
        tmdbIdStr,
        "error:",
        (error as any)?.message ?? String(error)
      );
    }
    return [];
  }
}