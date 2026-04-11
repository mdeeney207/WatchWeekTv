// web/app/where-to-watch/[slug]/page.tsx

import Image from "next/image";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

import EpisodeCountdown from "@/components/EpisodeCountdown";
import { shimmerBlurDataURL } from "@/lib/imagePlaceholders";
import {
  tmdbBackdropUrl,
  tmdbGetTvDetails,
  tmdbGetTvRecommendations,
  tmdbPosterUrl,
  tmdbSearchTv,
} from "@/lib/tmdb";

type OfferType = "flatrate" | "free" | "ads" | "rent" | "buy";

type ProviderLinkRow = {
  service_slug: string | null;
  destination_url: string | null;
  affiliate_url: string | null;
  country_code: string | null;
  is_active: boolean | null;
};

type AvailabilityRow = {
  service_slug: string | null;
  availability_type: string | null;
  country_code: string | null;
};

type ProviderDisplayRow = {
  serviceSlug: string;
  label: string;
  href: string;
  availabilityTypes: OfferType[];
};

type RelatedShow = {
  id: number;
  name: string;
  poster_path?: string | null;
  first_air_date?: string | null;
  vote_average?: number | null;
};

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function slugToQuery(slug: string) {
  return decodeURIComponent(slug)
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function parseTmdbIdFromSlug(slug: string) {
  const m = String(slug).match(/-(\d+)$/);
  if (!m) return null;
  const id = Number(m[1]);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function stripTmdbIdSuffix(slug: string) {
  return String(slug).replace(/-\d+$/, "").trim();
}

function buildCanonicalWhereToWatchSlug(name: string, tmdbId: number) {
  return `${slugify(name)}-${tmdbId}`;
}

function buildWhereToWatchHref(name: string, tmdbId: number) {
  return `/where-to-watch/${buildCanonicalWhereToWatchSlug(name, tmdbId)}`;
}

function prettyServiceName(slug: string) {
  const map: Record<string, string> = {
    "prime-video": "Prime Video",
    primevideo: "Prime Video",
    netflix: "Netflix",
    hulu: "Hulu",
    max: "Max",
    disney: "Disney+",
    "disney-plus": "Disney+",
    "apple-tv-plus": "Apple TV+",
    appletvplus: "Apple TV+",
    peacock: "Peacock",
    paramount: "Paramount+",
    "paramount-plus": "Paramount+",
    freevee: "Freevee",
    tubi: "Tubi",
    roku: "The Roku Channel",
    "roku-channel": "The Roku Channel",
    spectrumondemand: "Spectrum On Demand",
    "spectrum-on-demand": "Spectrum On Demand",
    youtubetv: "YouTube TV",
    "youtube-tv": "YouTube TV",
    fubotv: "FuboTV",
    "fubo-tv": "FuboTV",
  };

  const normalized = slug.toLowerCase();
  if (map[normalized]) return map[normalized];

  return normalized
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function offerLabel(type: OfferType) {
  switch (type) {
    case "flatrate":
      return "Subscription";
    case "free":
      return "Free";
    case "ads":
      return "With Ads";
    case "rent":
      return "Rent";
    case "buy":
      return "Buy";
    default:
      return type;
  }
}

function yearFromDate(d?: string | null) {
  if (!d) return null;
  const y = Number(String(d).slice(0, 4));
  return Number.isFinite(y) ? y : null;
}

function fmtVote(v?: number | null) {
  if (typeof v !== "number") return null;
  const x = Math.round(v * 10) / 10;
  return Number.isFinite(x) ? x.toFixed(1) : null;
}

function formatGenres(genres?: Array<{ name?: string | null }> | null) {
  if (!genres?.length) return "TV Series";
  return genres
    .map((g) => g?.name)
    .filter(Boolean)
    .slice(0, 3)
    .join(" • ");
}

function formatLongDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function pickNextEpisodeAirDate(
  seasons?: Array<{
    air_date?: string | null;
    season_number?: number | null;
  }> | null
) {
  if (!seasons?.length) return null;

  const now = new Date();
  const candidates = seasons
    .map((s) => s?.air_date)
    .filter((v): v is string => Boolean(v))
    .map((v) => new Date(`${v}T00:00:00`))
    .filter((d) => !Number.isNaN(d.getTime()) && d.getTime() >= now.getTime())
    .sort((a, b) => a.getTime() - b.getTime());

  return candidates.length ? candidates[0].toISOString() : null;
}

function getDaysUntil(dateISO?: string | null) {
  if (!dateISO) return null;
  const now = new Date();
  const target = new Date(dateISO);
  if (Number.isNaN(target.getTime())) return null;
  const diff = target.getTime() - now.getTime();
  if (diff < 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function buildProviderHref(tmdbId: number, serviceSlug: string) {
  return `/api/watch?show=${tmdbId}&provider=${encodeURIComponent(
    serviceSlug
  )}&surface=where_to_watch`;
}

function sameProviderSet(a: ProviderDisplayRow[], b: ProviderDisplayRow[]) {
  if (a.length !== b.length) return false;
  const aSet = new Set(a.map((x) => x.serviceSlug));
  return b.every((x) => aSet.has(x.serviceSlug));
}

function shouldRenderCategoryGroup(
  rows: ProviderDisplayRow[],
  all: ProviderDisplayRow[]
) {
  if (rows.length <= 1) return false;
  if (rows.length === all.length) return false;
  if (sameProviderSet(rows, all)) return false;
  return true;
}

function sortProviderRows(rows: ProviderDisplayRow[]) {
  return [...rows].sort((a, b) => {
    const aw = a.availabilityTypes.includes("flatrate")
      ? 0
      : a.availabilityTypes.includes("free")
      ? 1
      : a.availabilityTypes.includes("ads")
      ? 2
      : a.availabilityTypes.includes("rent")
      ? 3
      : a.availabilityTypes.includes("buy")
      ? 4
      : 99;

    const bw = b.availabilityTypes.includes("flatrate")
      ? 0
      : b.availabilityTypes.includes("free")
      ? 1
      : b.availabilityTypes.includes("ads")
      ? 2
      : b.availabilityTypes.includes("rent")
      ? 3
      : b.availabilityTypes.includes("buy")
      ? 4
      : 99;

    if (aw !== bw) return aw - bw;
    return a.label.localeCompare(b.label);
  });
}

function pickHeroOptions(rows: ProviderDisplayRow[]) {
  return sortProviderRows(rows).slice(0, 4);
}

async function resolveShowFromSlug(slug: string) {
  const tmdbIdFromSlug = parseTmdbIdFromSlug(slug);

  if (tmdbIdFromSlug) {
    const details = await tmdbGetTvDetails(tmdbIdFromSlug);
    if (details?.id && details?.name) {
      return {
        tmdbId: details.id,
        details,
        canonicalSlug: buildCanonicalWhereToWatchSlug(details.name, details.id),
      };
    }
  }

  const legacySlug = stripTmdbIdSuffix(slug);
  const query = slugToQuery(legacySlug);
  const results = await tmdbSearchTv(query);

  if (!results?.length) return null;

  const wanted = normalizeTitle(query);

  const exact =
    results.find((r) => normalizeTitle(r.name ?? "") === wanted) ??
    results.find((r) => slugify(r.name ?? "") === legacySlug) ??
    results[0];

  if (!exact?.id) return null;

  const details = await tmdbGetTvDetails(exact.id);
  if (!details?.id || !details?.name) return null;

  return {
    tmdbId: details.id,
    details,
    canonicalSlug: buildCanonicalWhereToWatchSlug(details.name, details.id),
  };
}

async function readProvidersForDisplay(tmdbShowId: number, countryCode = "US") {
  const supabase = createClient(
    mustEnv("NEXT_PUBLIC_SUPABASE_URL"),
    mustEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  const [
    { data: links, error: linksError },
    { data: availability, error: availabilityError },
  ] = await Promise.all([
    supabase
      .from("provider_links")
      .select(
        "service_slug, destination_url, affiliate_url, country_code, is_active"
      )
      .eq("tmdb_show_id", tmdbShowId)
      .eq("country_code", countryCode)
      .eq("is_active", true),
    supabase
      .from("show_provider_availability")
      .select("service_slug, availability_type, country_code")
      .eq("tmdb_show_id", tmdbShowId)
      .eq("country_code", countryCode),
  ]);

  if (linksError) {
    throw new Error(`Failed to load provider links: ${linksError.message}`);
  }

  if (availabilityError) {
    throw new Error(
      `Failed to load provider availability: ${availabilityError.message}`
    );
  }

  const linkRows = (links ?? []) as ProviderLinkRow[];
  const availabilityRows = (availability ?? []) as AvailabilityRow[];

  const bySlug = new Map<string, ProviderDisplayRow>();

  for (const row of linkRows) {
    const serviceSlug = row.service_slug?.trim();
    if (!serviceSlug) continue;

    bySlug.set(serviceSlug, {
      serviceSlug,
      label: prettyServiceName(serviceSlug),
      href: buildProviderHref(tmdbShowId, serviceSlug),
      availabilityTypes: [],
    });
  }

  for (const row of availabilityRows) {
    const serviceSlug = row.service_slug?.trim();
    const availabilityType = row.availability_type?.trim() as OfferType | null;

    if (!serviceSlug || !availabilityType) continue;

    if (!bySlug.has(serviceSlug)) {
      bySlug.set(serviceSlug, {
        serviceSlug,
        label: prettyServiceName(serviceSlug),
        href: buildProviderHref(tmdbShowId, serviceSlug),
        availabilityTypes: [],
      });
    }

    const current = bySlug.get(serviceSlug)!;
    if (!current.availabilityTypes.includes(availabilityType)) {
      current.availabilityTypes.push(availabilityType);
    }
  }

  const sortWeight: Record<OfferType, number> = {
    flatrate: 0,
    free: 1,
    ads: 2,
    rent: 3,
    buy: 4,
  };

  const rows = Array.from(bySlug.values()).sort((a, b) => {
    const aw =
      a.availabilityTypes.length > 0
        ? Math.min(...a.availabilityTypes.map((t) => sortWeight[t]))
        : 99;
    const bw =
      b.availabilityTypes.length > 0
        ? Math.min(...b.availabilityTypes.map((t) => sortWeight[t]))
        : 99;

    if (aw !== bw) return aw - bw;
    return a.label.localeCompare(b.label);
  });

  return {
    all: rows,
    flatrate: rows.filter((r) => r.availabilityTypes.includes("flatrate")),
    free: rows.filter((r) => r.availabilityTypes.includes("free")),
    ads: rows.filter((r) => r.availabilityTypes.includes("ads")),
    rent: rows.filter((r) => r.availabilityTypes.includes("rent")),
    buy: rows.filter((r) => r.availabilityTypes.includes("buy")),
  };
}

async function readRelatedShows(
  tmdbId: number,
  title: string
): Promise<RelatedShow[]> {
  const targetTitle = normalizeTitle(title);

  try {
    const recommended = await tmdbGetTvRecommendations(tmdbId, 8);

    const seenIds = new Set<number>();
    const seenNames = new Set<string>();
    const out: RelatedShow[] = [];

    for (const row of recommended) {
      const normalized = normalizeTitle(row.name ?? "");
      if (!row.id || row.id === tmdbId) continue;
      if (!normalized || normalized === targetTitle) continue;
      if (seenIds.has(row.id) || seenNames.has(normalized)) continue;
      if (!row.poster_path) continue;

      seenIds.add(row.id);
      seenNames.add(normalized);

      out.push({
        id: row.id,
        name: row.name,
        poster_path: row.poster_path ?? null,
        first_air_date: row.first_air_date ?? null,
        vote_average: row.vote_average ?? null,
      });

      if (out.length >= 4) break;
    }

    if (out.length) return out;
  } catch {
    //
  }

  try {
    const fallback = await tmdbSearchTv(title);

    const seenIds = new Set<number>();
    const seenNames = new Set<string>();

    return (fallback ?? [])
      .filter((r) => {
        const normalized = normalizeTitle(r.name ?? "");
        if (!r.id || r.id === tmdbId) return false;
        if (!normalized || normalized === targetTitle) return false;
        if (seenIds.has(r.id) || seenNames.has(normalized)) return false;
        if (!r.poster_path) return false;

        seenIds.add(r.id);
        seenNames.add(normalized);
        return true;
      })
      .slice(0, 4)
      .map((r) => ({
        id: r.id,
        name: r.name ?? `TMDB ${r.id}`,
        poster_path: r.poster_path ?? null,
        first_air_date: r.first_air_date ?? null,
        vote_average: r.vote_average ?? null,
      }));
  } catch {
    return [];
  }
}

function StatPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.16em] text-white/45">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-white">{value}</div>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_10px_40px_rgba(0,0,0,0.28)] md:p-6">
      <div className="mb-5">
        <h2 className="text-xl font-semibold tracking-tight text-white">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-sm text-white/55">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function ProviderCard({
  provider,
  featured = false,
}: {
  provider: ProviderDisplayRow;
  featured?: boolean;
}) {
  return (
    <a
      href={provider.href}
      className={[
        "group rounded-[24px] border px-4 py-4 transition md:px-5 md:py-5",
        featured
          ? "border-emerald-400/25 bg-[linear-gradient(180deg,rgba(16,34,26,0.95)_0%,rgba(14,23,34,0.96)_100%)] hover:border-emerald-300/40"
          : "border-white/10 bg-[#101722] hover:border-emerald-400/25 hover:bg-[#131d2a]",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-base font-semibold text-white group-hover:text-emerald-300">
            ▶ Watch on {provider.label}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {provider.availabilityTypes.length ? (
              provider.availabilityTypes.map((type) => (
                <span
                  key={type}
                  className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-300"
                >
                  {offerLabel(type)}
                </span>
              ))
            ) : (
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-white/55">
                Available
              </span>
            )}
          </div>
        </div>

        <div className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/55">
          {provider.label}
        </div>
      </div>
    </a>
  );
}

function ProviderGroup({
  title,
  rows,
}: {
  title: string;
  rows: ProviderDisplayRow[];
}) {
  if (!rows.length) return null;

  return (
    <SectionCard
      title={title}
      subtitle="Streaming options currently available for this show."
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((provider, idx) => (
          <ProviderCard
            key={`${title}-${provider.serviceSlug}`}
            provider={provider}
            featured={idx === 0}
          />
        ))}
      </div>
    </SectionCard>
  );
}

function CompactHeroProviderChip({
  provider,
  primary = false,
}: {
  provider: ProviderDisplayRow;
  primary?: boolean;
}) {
  const topType = provider.availabilityTypes[0];

  return (
    <a
      href={provider.href}
      className={[
        "group inline-flex min-h-11 items-center gap-2 rounded-2xl border px-3.5 py-2 text-sm font-semibold transition",
        primary
          ? "border-emerald-400/25 bg-emerald-500 text-black hover:bg-emerald-400"
          : "border-white/10 bg-white/[0.06] text-white hover:border-emerald-400/25 hover:bg-white/[0.09]",
      ].join(" ")}
      title={`Watch on ${provider.label}`}
    >
      <span className="truncate">
        {primary ? `▶ Watch on ${provider.label}` : provider.label}
      </span>
      {topType ? (
        <span
          className={[
            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
            primary
              ? "bg-black/10 text-black/75"
              : "bg-white/[0.08] text-white/60",
          ].join(" ")}
        >
          {offerLabel(topType)}
        </span>
      ) : null}
    </a>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string };
}) {
  const resolved =
    typeof (params as Promise<{ slug: string }>)?.then === "function"
      ? await (params as Promise<{ slug: string }>)
      : (params as { slug: string });

  const show = await resolveShowFromSlug(resolved.slug);

  if (!show?.details) {
    return {
      title: "Where to Watch | WatchWeek",
      description: "Find where to stream your favorite TV shows on WatchWeek.",
    };
  }

  const details = show.details;
  const title = details.name ?? slugToQuery(stripTmdbIdSuffix(resolved.slug));
  const year = yearFromDate(details.first_air_date);
  const description =
    details.overview?.trim() ||
    `Find where to watch ${title}${
      year ? ` (${year})` : ""
    } and see available streaming providers on WatchWeek.`;

  const poster = tmdbPosterUrl(details.poster_path, "w500");

  return {
    title: `Where to Watch ${title}${year ? ` (${year})` : ""} | WatchWeek`,
    description,
    openGraph: {
      title: `Where to Watch ${title}${year ? ` (${year})` : ""} | WatchWeek`,
      description,
      images: poster ? [poster] : [],
      url: `https://watchweektv.com/where-to-watch/${show.canonicalSlug}`,
    },
    alternates: {
      canonical: `/where-to-watch/${show.canonicalSlug}`,
    },
  };
}

export default async function WhereToWatchPage({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string };
}) {
  const resolved =
    typeof (params as Promise<{ slug: string }>)?.then === "function"
      ? await (params as Promise<{ slug: string }>)
      : (params as { slug: string });

  const show = await resolveShowFromSlug(resolved.slug);

  if (!show?.details) {
    notFound();
  }

  if (resolved.slug !== show.canonicalSlug) {
    permanentRedirect(`/where-to-watch/${show.canonicalSlug}`);
  }

  const tmdbId = show.tmdbId;
  const details = show.details;

  const [providers, relatedShows] = await Promise.all([
    readProvidersForDisplay(tmdbId, "US"),
    readRelatedShows(
      tmdbId,
      details.name ?? slugToQuery(stripTmdbIdSuffix(resolved.slug))
    ),
  ]);

  const title = details.name ?? slugToQuery(stripTmdbIdSuffix(resolved.slug));
  const year = yearFromDate(details.first_air_date);
  const vote = fmtVote(details.vote_average);
  const genres = formatGenres(details.genres);
  const hero = tmdbBackdropUrl(details.backdrop_path, "w1280");
  const poster = tmdbPosterUrl(details.poster_path, "w500");
  const nextAirISO = details.next_episode_to_air?.air_date
    ? new Date(`${details.next_episode_to_air.air_date}T00:00:00`).toISOString()
    : pickNextEpisodeAirDate(details.seasons);
  const daysUntilNextEpisode = getDaysUntil(nextAirISO);

  const hasAnyProviders = providers.all.length > 0;
  const bestSubscription = providers.flatrate[0] ?? null;
  const bestFree = providers.free[0] ?? null;
  const bestAds = providers.ads[0] ?? null;
  const heroPrimary =
    bestSubscription ?? bestFree ?? bestAds ?? providers.all[0] ?? null;

  const heroOptions = pickHeroOptions(
    providers.all.filter((p) => p.serviceSlug !== heroPrimary?.serviceSlug)
  );
  const heroMoreCount = Math.max(
    0,
    providers.all.length - heroOptions.length - (heroPrimary ? 1 : 0)
  );

  const showSubscriptionGroup = shouldRenderCategoryGroup(
    providers.flatrate,
    providers.all
  );
  const showFreeGroup = shouldRenderCategoryGroup(providers.free, providers.all);
  const showAdsGroup = shouldRenderCategoryGroup(providers.ads, providers.all);
  const showRentGroup = shouldRenderCategoryGroup(providers.rent, providers.all);
  const showBuyGroup = shouldRenderCategoryGroup(providers.buy, providers.all);

  const canonicalUrl = `https://watchweektv.com/where-to-watch/${show.canonicalSlug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TVSeries",
    name: title,
    url: canonicalUrl,
    image: poster || undefined,
    description: details.overview || undefined,
    datePublished: details.first_air_date || undefined,
    aggregateRating: vote
      ? {
          "@type": "AggregateRating",
          ratingValue: vote,
          bestRating: "10",
          worstRating: "0",
          ratingCount: details.vote_count ?? undefined,
        }
      : undefined,
  };

  return (
    <main className="min-h-screen bg-[#07111B] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="relative isolate overflow-hidden border-b border-white/8">
        <div className="absolute inset-0">
          {hero ? (
            <Image
              src={hero}
              alt={title}
              fill
              priority
              className="object-cover opacity-35"
              placeholder="blur"
              blurDataURL={shimmerBlurDataURL()}
              sizes="100vw"
            />
          ) : null}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_22%),linear-gradient(180deg,rgba(7,17,27,0.18)_0%,rgba(7,17,27,0.82)_58%,#07111B_100%)]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 py-10 md:px-8 lg:px-10 lg:py-14">
          <div className="grid gap-8 lg:grid-cols-[300px_1fr] lg:items-start">
            <div className="mx-auto w-full max-w-[300px] lg:mx-0">
              <div className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04] shadow-[0_24px_80px_rgba(0,0,0,0.42)]">
                {poster ? (
                  <Image
                    src={poster}
                    alt={title}
                    width={500}
                    height={750}
                    className="h-auto w-full object-cover"
                    placeholder="blur"
                    blurDataURL={shimmerBlurDataURL()}
                    sizes="(max-width: 1024px) 300px, 340px"
                  />
                ) : (
                  <div className="flex aspect-[2/3] items-center justify-center bg-white/[0.04] text-sm text-white/45">
                    No Poster
                  </div>
                )}
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-emerald-300/85">
                <span>Where to Watch</span>
                {year ? <span className="text-white/35">•</span> : null}
                {year ? <span>{year}</span> : null}
              </div>

              <h1 className="mt-3 max-w-5xl text-4xl font-semibold tracking-tight text-white md:text-5xl lg:text-6xl">
                Where to Watch {title}
              </h1>

              <div className="mt-4 flex flex-wrap gap-2 md:gap-3">
                <StatPill label="Genres" value={genres} />
                {vote ? <StatPill label="TMDB" value={`${vote}/10`} /> : null}
                {details.number_of_seasons ? (
                  <StatPill label="Seasons" value={`${details.number_of_seasons}`} />
                ) : null}
                {details.status ? (
                  <StatPill label="Status" value={details.status} />
                ) : null}
                <StatPill label="Providers" value={`${providers.all.length}`} />
              </div>

              {details.overview ? (
                <p className="mt-6 max-w-4xl text-sm leading-7 text-white/72 md:text-base md:leading-8">
                  {details.overview}
                </p>
              ) : null}

              <div className="mt-7 flex flex-wrap gap-3">
                {heroPrimary ? (
                  <a
                    href={heroPrimary.href}
                    className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400"
                  >
                    ▶ Watch on {heroPrimary.label}
                  </a>
                ) : null}

                <Link
                  href={`/tv/${tmdbId}`}
                  className="rounded-full border border-white/12 bg-white/[0.04] px-6 py-3 text-sm font-medium text-white/88 transition hover:bg-white/[0.08]"
                >
                  View full show page
                </Link>
              </div>

              <div className="mt-8 grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
                <div className="rounded-[26px] border border-white/10 bg-white/[0.05] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-300/85">
                      Top streaming options
                    </div>

                    {hasAnyProviders ? (
                      <div className="text-xs text-white/45">United States</div>
                    ) : null}
                  </div>

                  {heroPrimary ? (
                    <>
                      <div className="mt-4">
                        <CompactHeroProviderChip provider={heroPrimary} primary />
                      </div>

                      {heroOptions.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {heroOptions.map((provider) => (
                            <CompactHeroProviderChip
                              key={`hero-${provider.serviceSlug}`}
                              provider={provider}
                            />
                          ))}

                          <a
                            href="#all-streaming-options"
                            className="inline-flex min-h-11 items-center rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm font-semibold text-white/75 transition hover:bg-white/[0.08]"
                          >
                            {heroMoreCount > 0
                              ? `+${heroMoreCount} more options`
                              : "See all options"}
                          </a>
                        </div>
                      ) : (
                        <div className="mt-3">
                          <a
                            href="#all-streaming-options"
                            className="inline-flex min-h-11 items-center rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm font-semibold text-white/75 transition hover:bg-white/[0.08]"
                          >
                            See all streaming options
                          </a>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="mt-3 text-sm leading-7 text-white/60">
                      Provider options are syncing now. Open the full show page or
                      scroll down for the latest available streaming rows.
                    </div>
                  )}
                </div>

                <div className="rounded-[26px] border border-white/10 bg-white/[0.05] p-5">
                  <div className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-emerald-300/85">
                    Next episode
                  </div>

                  {nextAirISO ? (
                    <>
                      <div className="mb-3 text-sm text-white/60">
                        {daysUntilNextEpisode === 0
                          ? "Drops today"
                          : daysUntilNextEpisode === 1
                          ? "Drops in 1 day"
                          : `Drops in ${daysUntilNextEpisode} days`}
                      </div>
                      <EpisodeCountdown dateISO={nextAirISO} />
                    </>
                  ) : (
                    <div className="text-sm leading-7 text-white/60">
                      No upcoming episode date is currently available.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-6 px-6 py-8 md:px-8 lg:px-10 lg:py-10">
        {hasAnyProviders ? (
          <>
            <div id="all-streaming-options" />
            <SectionCard
              title="All streaming options"
              subtitle="This is the core reason this page exists. Make it obvious, clickable, and useful."
            >
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {providers.all.map((provider, idx) => (
                  <ProviderCard
                    key={`all-${provider.serviceSlug}`}
                    provider={provider}
                    featured={idx < 2}
                  />
                ))}
              </div>
            </SectionCard>

            {showSubscriptionGroup ? (
              <ProviderGroup
                title="Watch with Subscription"
                rows={providers.flatrate}
              />
            ) : null}

            {showFreeGroup ? (
              <ProviderGroup title="Watch Free" rows={providers.free} />
            ) : null}

            {showAdsGroup ? (
              <ProviderGroup title="Watch with Ads" rows={providers.ads} />
            ) : null}

            {showRentGroup ? (
              <ProviderGroup title="Rent" rows={providers.rent} />
            ) : null}

            {showBuyGroup ? (
              <ProviderGroup title="Buy" rows={providers.buy} />
            ) : null}
          </>
        ) : (
          <section className="rounded-[28px] border border-dashed border-white/12 bg-white/[0.03] p-8 text-center">
            <div className="text-xl font-semibold text-white">
              No U.S. provider data available yet
            </div>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-white/62 md:text-base">
              This show was found in TMDB, but WatchWeek has not synced
              streaming availability for it yet. Open the full show page to
              trigger provider sync, then refresh this page.
            </p>
            <div className="mt-6">
              <Link
                href={`/tv/${tmdbId}`}
                className="rounded-full bg-emerald-500 px-5 py-3 text-sm font-medium text-black transition hover:bg-emerald-400"
              >
                Open full show page
              </Link>
            </div>
          </section>
        )}

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <SectionCard
            title="Why use WatchWeek?"
            subtitle="This section needs to sell utility fast."
          >
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[22px] border border-white/8 bg-[#101722] p-4">
                <div className="text-sm font-semibold text-white">
                  Streaming clarity
                </div>
                <p className="mt-2 text-sm leading-6 text-white/62">
                  Instantly see where a show streams without bouncing across
                  multiple apps or search results.
                </p>
              </div>

              <div className="rounded-[22px] border border-white/8 bg-[#101722] p-4">
                <div className="text-sm font-semibold text-white">
                  Episode timing
                </div>
                <p className="mt-2 text-sm leading-6 text-white/62">
                  Track new episodes and know what drops tonight, tomorrow, and
                  this week.
                </p>
              </div>

              <div className="rounded-[22px] border border-white/8 bg-[#101722] p-4">
                <div className="text-sm font-semibold text-white">
                  Fast watch buttons
                </div>
                <p className="mt-2 text-sm leading-6 text-white/62">
                  Jump directly to the provider from WatchWeek with one click.
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Quick facts"
            subtitle="Useful metadata for users and search traffic."
          >
            <dl className="space-y-3 text-sm">
              <div className="flex items-start justify-between gap-4 border-b border-white/8 pb-3">
                <dt className="text-white/55">Title</dt>
                <dd className="text-right text-white">{title}</dd>
              </div>
              <div className="flex items-start justify-between gap-4 border-b border-white/8 pb-3">
                <dt className="text-white/55">First aired</dt>
                <dd className="text-right text-white">
                  {formatLongDate(details.first_air_date)}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4 border-b border-white/8 pb-3">
                <dt className="text-white/55">Genres</dt>
                <dd className="text-right text-white">{genres}</dd>
              </div>
              <div className="flex items-start justify-between gap-4 border-b border-white/8 pb-3">
                <dt className="text-white/55">TMDB rating</dt>
                <dd className="text-right text-white">
                  {vote ? `${vote}/10` : "—"}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4 border-b border-white/8 pb-3">
                <dt className="text-white/55">Status</dt>
                <dd className="text-right text-white">
                  {details.status || "—"}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4 border-b border-white/8 pb-3">
                <dt className="text-white/55">Provider options</dt>
                <dd className="text-right text-white">{providers.all.length}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-white/55">WatchWeek page</dt>
                <dd className="text-right">
                  <Link
                    href={`/tv/${tmdbId}`}
                    className="text-emerald-300 transition hover:text-emerald-200"
                  >
                    /tv/{tmdbId}
                  </Link>
                </dd>
              </div>
            </dl>
          </SectionCard>
        </section>

        <SectionCard
          title="More shows to discover"
          subtitle="Internal linking for retention and SEO."
        >
          {relatedShows.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {relatedShows.map((show) => {
                const showHref = buildWhereToWatchHref(show.name, show.id);
                const showPoster = tmdbPosterUrl(show.poster_path ?? null, "w342");
                const showYear = yearFromDate(show.first_air_date);
                const showVote = fmtVote(show.vote_average);

                return (
                  <Link
                    key={show.id}
                    href={showHref}
                    className="group rounded-[24px] border border-white/10 bg-[#101722] p-3 transition hover:border-emerald-400/25 hover:bg-[#131d2a]"
                  >
                    <div className="overflow-hidden rounded-[18px] bg-white/[0.04]">
                      {showPoster ? (
                        <Image
                          src={showPoster}
                          alt={show.name}
                          width={342}
                          height={513}
                          className="h-auto w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                          placeholder="blur"
                          blurDataURL={shimmerBlurDataURL()}
                          sizes="(max-width: 768px) 50vw, 25vw"
                        />
                      ) : (
                        <div className="flex aspect-[2/3] items-center justify-center text-sm text-white/40">
                          No Poster
                        </div>
                      )}
                    </div>

                    <div className="mt-3">
                      <div className="line-clamp-2 text-base font-semibold text-white group-hover:text-emerald-300">
                        {show.name}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-white/55">
                        {showYear ? <span>{showYear}</span> : null}
                        {showVote ? <span>TMDB {showVote}</span> : null}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-white/55">
              Related discovery links are not available yet.
            </div>
          )}
        </SectionCard>
      </div>
    </main>
  );
}