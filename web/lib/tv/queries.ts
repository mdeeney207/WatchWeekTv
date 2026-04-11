import { createClient } from "@/lib/supabase-browser";
import {
  tmdbDiscoverTvByProvider,
  tmdbGetTrendingTv,
  tmdbGetTvDetails,
  type TmdbTrendingTvResult,
} from "@/lib/tmdb";

export type ReleaseItem = {
  show_id: number;
  title: string;
  air_date: string;
  posterUrl?: string;
  backdropUrl?: string;
  overview?: string;
  provider?: string | null;
};

type ReleaseSeed = {
  id: number;
  title: string;
  posterUrl?: string;
  backdropUrl?: string;
  overview?: string;
  firstAirDate?: string;
  provider?: string | null;
};

const PROVIDER_RAILS = [
  { label: "Netflix", slug: "netflix" },
  { label: "Hulu", slug: "hulu" },
  { label: "Max", slug: "max" },
  { label: "Prime Video", slug: "prime-video" },
  { label: "Disney+", slug: "disney-plus" },
  { label: "Apple TV+", slug: "apple-tv-plus" },
  { label: "Peacock", slug: "peacock" },
  { label: "Paramount+", slug: "paramount-plus" },
] as const;

const THIS_WEEK_MIN_DAYS = 0;
const THIS_WEEK_MAX_DAYS = 7;
const FOLLOW_MIN_DAYS = 0;
const FOLLOW_MAX_DAYS = 30;
const PROVIDER_MIN_DAYS = 0;
const PROVIDER_MAX_DAYS = 30;

const TRENDING_DAY_LIMIT = 16;
const TRENDING_WEEK_LIMIT = 16;
const PROVIDER_SEED_LIMIT = 6;
const THIS_WEEK_CANDIDATE_LIMIT = 20;
const THIS_WEEK_RESULT_LIMIT = 18;
const PROVIDER_RESULT_LIMIT = 6;
const PROVIDER_SUPPLEMENT_COUNT = 4;
const DETAIL_BATCH_SIZE = 6;

const DETAIL_TTL_MS = 5 * 60 * 1000;
const PROVIDER_SEED_TTL_MS = 10 * 60 * 1000;
const THIS_WEEK_TTL_MS = 5 * 60 * 1000;
const PROVIDER_RAILS_TTL_MS = 5 * 60 * 1000;
const FOLLOW_TTL_MS = 2 * 60 * 1000;

type CacheEntry<T> = {
  expiresAt: number;
  promise: Promise<T>;
};

const tvDetailsCache = new Map<
  number,
  CacheEntry<Awaited<ReturnType<typeof tmdbGetTvDetails>>>
>();
const providerSeedCache = new Map<string, CacheEntry<TmdbTrendingTvResult[]>>();
const thisWeekDropsCache = new Map<string, CacheEntry<ReleaseItem[]>>();
const providerRailsCache = new Map<
  string,
  CacheEntry<Record<string, ReleaseItem[]>>
>();
const becauseYouFollowCache = new Map<string, CacheEntry<ReleaseItem[]>>();

function getCachedPromise<K extends string | number, T>(
  map: Map<K, CacheEntry<T>>,
  key: K,
  ttlMs: number,
  loader: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const existing = map.get(key);

  if (existing && existing.expiresAt > now) {
    return existing.promise;
  }

  const promise = loader().catch((error) => {
    const current = map.get(key);
    if (current?.promise === promise) {
      map.delete(key);
    }
    throw error;
  });

  map.set(key, {
    expiresAt: now + ttlMs,
    promise,
  });

  return promise;
}

function startOfTodayUtc() {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
}

function parseUtcDateString(value: string) {
  return new Date(`${value}T00:00:00Z`);
}

function isValidAirDate(value?: string | null): value is string {
  if (!value) return false;
  const time = parseUtcDateString(value).getTime();
  return Number.isFinite(time);
}

function daysFromTodayUtc(dateString: string) {
  const target = parseUtcDateString(dateString);
  const today = startOfTodayUtc();

  return Math.floor(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
}

function isWithinDayWindow(dateString: string, minDays: number, maxDays: number) {
  const diffDays = daysFromTodayUtc(dateString);
  return diffDays >= minDays && diffDays <= maxDays;
}

function sortByAirDate(items: ReleaseItem[]) {
  return [...items].sort((a, b) => {
    const diff =
      parseUtcDateString(a.air_date).getTime() -
      parseUtcDateString(b.air_date).getTime();

    if (diff !== 0) return diff;
    return a.title.localeCompare(b.title);
  });
}

function dedupeByShowId(items: ReleaseItem[]) {
  return Array.from(
    new Map(items.map((item) => [item.show_id, item])).values()
  );
}

function dedupeSeedsById(items: ReleaseSeed[]) {
  const seen = new Set<number>();
  const out: ReleaseSeed[] = [];

  for (const item of items) {
    if (!Number.isFinite(item.id)) continue;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }

  return out;
}

function trendingToSeed(item: TmdbTrendingTvResult): ReleaseSeed | null {
  if (!Number.isFinite(item.id) || !item.title) return null;

  return {
    id: item.id,
    title: item.title,
    posterUrl: item.posterUrl,
    backdropUrl: item.backdropUrl,
    overview: item.overview,
    firstAirDate: item.firstAirDate,
    provider: null,
  };
}

function mergeSeedWithProvider(seed: ReleaseSeed, provider: string | null): ReleaseSeed {
  return {
    ...seed,
    provider,
  };
}

function getTvDetailsCached(tmdbId: number) {
  const key = Number(tmdbId);

  return getCachedPromise(tvDetailsCache, key, DETAIL_TTL_MS, async () => {
    try {
      return await tmdbGetTvDetails(key);
    } catch {
      return null;
    }
  });
}

function getProviderSeedsCached(providerSlug: string, region = "US", limit = 6) {
  const key = `${providerSlug}:${region}:${limit}`;

  return getCachedPromise(
    providerSeedCache,
    key,
    PROVIDER_SEED_TTL_MS,
    async () => {
      try {
        return await tmdbDiscoverTvByProvider(providerSlug, region, limit);
      } catch {
        return [];
      }
    }
  );
}

async function buildReleaseFromTmdbId(
  tmdbId: number,
  fallback?: {
    title?: string;
    posterUrl?: string;
    backdropUrl?: string;
    overview?: string;
    provider?: string | null;
  }
): Promise<ReleaseItem | null> {
  if (!Number.isFinite(tmdbId)) return null;

  const details = await getTvDetailsCached(tmdbId);
  const next = details?.next_episode_to_air;

  if (!details?.name || !isValidAirDate(next?.air_date)) {
    return null;
  }

  return {
    show_id: tmdbId,
    title: details.name,
    air_date: next.air_date,
    posterUrl: fallback?.posterUrl,
    backdropUrl: fallback?.backdropUrl,
    overview: details.overview ?? fallback?.overview ?? undefined,
    provider: fallback?.provider ?? null,
  };
}

async function runInBatches<T, R>(
  items: T[],
  batchSize: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const out: R[] = [];

  for (let index = 0; index < items.length; index += batchSize) {
    const batch = items.slice(index, index + batchSize);
    const settled = await Promise.allSettled(batch.map(mapper));

    for (const result of settled) {
      if (result.status === "fulfilled") {
        out.push(result.value);
      }
    }
  }

  return out;
}

async function buildReleasesFromSeeds(
  seeds: ReleaseSeed[],
  options: {
    minDays: number;
    maxDays: number;
    candidateLimit: number;
    resultLimit: number;
  }
): Promise<ReleaseItem[]> {
  const { minDays, maxDays, candidateLimit, resultLimit } = options;

  const candidateSeeds = seeds.slice(0, candidateLimit);

  const releases = await runInBatches(
    candidateSeeds,
    DETAIL_BATCH_SIZE,
    async (item) =>
      buildReleaseFromTmdbId(item.id, {
        title: item.title,
        posterUrl: item.posterUrl,
        backdropUrl: item.backdropUrl,
        overview: item.overview,
        provider: item.provider ?? null,
      })
  );

  const filtered = releases.filter((item): item is ReleaseItem => {
    if (!item) return false;
    return isWithinDayWindow(item.air_date, minDays, maxDays);
  });

  return sortByAirDate(dedupeByShowId(filtered)).slice(0, resultLimit);
}

async function collectTrendingSeeds(): Promise<ReleaseSeed[]> {
  const [trendingDay, trendingWeek] = await Promise.all([
    tmdbGetTrendingTv(TRENDING_DAY_LIMIT, "day").catch(() => []),
    tmdbGetTrendingTv(TRENDING_WEEK_LIMIT, "week").catch(() => []),
  ]);

  return dedupeSeedsById(
    [...trendingDay, ...trendingWeek]
      .map(trendingToSeed)
      .filter((item): item is ReleaseSeed => Boolean(item))
  );
}

async function collectProviderSeeds(
  maxProviders = PROVIDER_RAILS.length
): Promise<ReleaseSeed[]> {
  const selectedProviders = PROVIDER_RAILS.slice(0, maxProviders);

  const providerGroups = await Promise.all(
    selectedProviders.map(async ({ label, slug }) => {
      const items = await getProviderSeedsCached(slug, "US", PROVIDER_SEED_LIMIT);

      return items
        .map(trendingToSeed)
        .filter((item): item is ReleaseSeed => Boolean(item))
        .map((item) => mergeSeedWithProvider(item, label));
    })
  );

  return dedupeSeedsById(providerGroups.flat());
}

async function buildThisWeekSeeds(): Promise<ReleaseSeed[]> {
  const trendingSeeds = await collectTrendingSeeds();

  if (trendingSeeds.length >= THIS_WEEK_CANDIDATE_LIMIT) {
    return trendingSeeds.slice(0, THIS_WEEK_CANDIDATE_LIMIT);
  }

  const providerSeeds = await collectProviderSeeds(PROVIDER_SUPPLEMENT_COUNT);

  return dedupeSeedsById([...trendingSeeds, ...providerSeeds]).slice(
    0,
    THIS_WEEK_CANDIDATE_LIMIT
  );
}

export async function getThisWeekDrops(): Promise<ReleaseItem[]> {
  return getCachedPromise(
    thisWeekDropsCache,
    "this-week:v2",
    THIS_WEEK_TTL_MS,
    async () => {
      const seeds = await buildThisWeekSeeds();

      return buildReleasesFromSeeds(seeds, {
        minDays: THIS_WEEK_MIN_DAYS,
        maxDays: THIS_WEEK_MAX_DAYS,
        candidateLimit: THIS_WEEK_CANDIDATE_LIMIT,
        resultLimit: THIS_WEEK_RESULT_LIMIT,
      });
    }
  );
}

export async function getBecauseYouFollow(
  userId: string
): Promise<ReleaseItem[]> {
  if (!userId) return [];

  return getCachedPromise(
    becauseYouFollowCache,
    `follow:${userId}`,
    FOLLOW_TTL_MS,
    async () => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("user_shows")
        .select("tmdb_id")
        .eq("user_id", userId);

      if (error || !data?.length) return [];

      const tmdbIds = Array.from(
        new Set(
          data
            .map((row) => Number(row.tmdb_id))
            .filter((value) => Number.isFinite(value))
        )
      );

      if (!tmdbIds.length) return [];

      const releases = await runInBatches(
        tmdbIds,
        DETAIL_BATCH_SIZE,
        async (tmdbId) => buildReleaseFromTmdbId(tmdbId)
      );

      const filtered = releases.filter((item): item is ReleaseItem => {
        if (!item) return false;
        return isWithinDayWindow(item.air_date, FOLLOW_MIN_DAYS, FOLLOW_MAX_DAYS);
      });

      return sortByAirDate(dedupeByShowId(filtered));
    }
  );
}

export async function getProviderRails(): Promise<Record<string, ReleaseItem[]>> {
  return getCachedPromise(
    providerRailsCache,
    "provider-rails:v2",
    PROVIDER_RAILS_TTL_MS,
    async () => {
      const entries = await Promise.all(
        PROVIDER_RAILS.map(async ({ label, slug }) => {
          const seeds = await getProviderSeedsCached(
            slug,
            "US",
            PROVIDER_SEED_LIMIT
          );

          if (!seeds.length) {
            return [label, []] as const;
          }

          const normalizedSeeds = dedupeSeedsById(
            seeds
              .map(trendingToSeed)
              .filter((item): item is ReleaseSeed => Boolean(item))
              .map((item) => mergeSeedWithProvider(item, label))
          );

          const releases = await buildReleasesFromSeeds(normalizedSeeds, {
            minDays: PROVIDER_MIN_DAYS,
            maxDays: PROVIDER_MAX_DAYS,
            candidateLimit: PROVIDER_SEED_LIMIT,
            resultLimit: PROVIDER_RESULT_LIMIT,
          });

          return [label, releases] as const;
        })
      );

      return Object.fromEntries(
        entries.filter(([, items]) => Array.isArray(items) && items.length > 0)
      );
    }
  );
}