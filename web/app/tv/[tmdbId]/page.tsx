// web/app/tv/[tmdbId]/page.tsx

import Image from "next/image";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

import EpisodeCountdown from "@/components/EpisodeCountdown";
import { shimmerBlurDataURL } from "@/lib/imagePlaceholders";
import { tmdbBackdropUrl, tmdbGetTvDetails, tmdbPosterUrl } from "@/lib/tmdb";
import {
  resolvePrimaryProvider,
  type ProviderDisplayRow,
  type ResolvedProviderOption,
} from "@/lib/providers/resolvePrimaryProvider";
import TvDetailActionsClient from "./TvDetailActionsClient";

type AvailabilityType = "subscription" | "free" | "ads" | "rent" | "buy";

type NextEpisodeLite = {
  air_date?: string | null;
  name?: string | null;
  season_number?: number | null;
  episode_number?: number | null;
  overview?: string | null;
};

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

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function firstEnv(...names: string[]) {
  for (const n of names) {
    const v = process.env[n];
    if (v) return v;
  }
  throw new Error(`Missing env var: tried ${names.join(", ")}`);
}

function slugify(value?: string | null) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function buildWhereToWatchHref(
  name?: string | null,
  tmdbId?: number | string | null
) {
  const safeName = slugify(name);
  const safeId = Number(tmdbId);
  if (!safeName || !Number.isFinite(safeId) || safeId <= 0) return null;
  return `/where-to-watch/${safeName}-${safeId}`;
}

function availabilityLabel(t: AvailabilityType) {
  switch (t) {
    case "subscription":
      return "Streaming";
    case "free":
      return "Free";
    case "ads":
      return "With ads";
    case "rent":
      return "Rent";
    case "buy":
      return "Buy";
    default:
      return "Available";
  }
}

function formatEpisodeCode(
  season?: number | null,
  episode?: number | null
): string | null {
  if (
    typeof season !== "number" ||
    !Number.isFinite(season) ||
    typeof episode !== "number" ||
    !Number.isFinite(episode)
  ) {
    return null;
  }

  return `S${String(season).padStart(2, "0")}E${String(episode).padStart(
    2,
    "0"
  )}`;
}

function formatLongDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

async function readProvidersForDisplay(
  supabase: ReturnType<typeof createClient>,
  tmdbShowId: number,
  country: string = "US"
): Promise<ProviderDisplayRow[]> {
  const availabilityQ = await supabase
    .from("show_provider_availability")
    .select("service_slug, availability_type")
    .eq("tmdb_show_id", tmdbShowId)
    .eq("country_code", country);

  if (availabilityQ.error) throw new Error(availabilityQ.error.message);

  const availabilityRows =
    (availabilityQ.data as Array<{
      service_slug: string;
      availability_type: AvailabilityType;
    }> | null) ?? [];

  if (!availabilityRows.length) return [];

  const slugs = Array.from(new Set(availabilityRows.map((r) => r.service_slug)));

  const servicesQ = await supabase
    .from("streaming_services")
    .select("slug, name, logo_url, affiliate_supported")
    .in("slug", slugs);

  if (servicesQ.error) throw new Error(servicesQ.error.message);

  const serviceRows =
    (servicesQ.data as Array<{
      slug: string;
      name: string;
      logo_url: string | null;
      affiliate_supported: boolean | null;
    }> | null) ?? [];

  const linksQ = await supabase
    .from("provider_links")
    .select("service_slug, destination_url, affiliate_url")
    .eq("tmdb_show_id", tmdbShowId)
    .eq("country_code", country)
    .eq("is_active", true);

  if (linksQ.error) throw new Error(linksQ.error.message);

  const linkRows =
    (linksQ.data as Array<{
      service_slug: string;
      destination_url: string | null;
      affiliate_url: string | null;
    }> | null) ?? [];

  const serviceBySlug = new Map(serviceRows.map((r) => [r.slug, r]));
  const linkBySlug = new Map(linkRows.map((r) => [r.service_slug, r]));

  const deduped = new Map<string, ProviderDisplayRow>();

  for (const row of availabilityRows) {
    const svc = serviceBySlug.get(row.service_slug);
    if (!svc) continue;

    const link = linkBySlug.get(row.service_slug);
    const key = `${row.service_slug}__${row.availability_type}`;
    if (deduped.has(key)) continue;

    deduped.set(key, {
      service_slug: row.service_slug,
      availability_type: row.availability_type,
      name: svc.name,
      logo_url: svc.logo_url ?? null,
      affiliate_supported: Boolean(svc.affiliate_supported),
      destination_url: link?.destination_url ?? null,
      affiliate_url: link?.affiliate_url ?? null,
    });
  }

  const order: Record<AvailabilityType, number> = {
    subscription: 1,
    free: 2,
    ads: 3,
    rent: 4,
    buy: 5,
  };

  return Array.from(deduped.values()).sort((a, b) => {
    const byType = order[a.availability_type] - order[b.availability_type];
    if (byType !== 0) return byType;
    return a.name.localeCompare(b.name);
  });
}

export default async function TvDetailsPage({
  params,
}: {
  params: Promise<{ tmdbId: string }>;
}) {
  const { tmdbId } = await params;

  const tv = await tmdbGetTvDetails(tmdbId);

  const title = tv?.name ?? "TV Details";
  const year = yearFromDate(tv?.first_air_date);
  const poster = tmdbPosterUrl(tv?.poster_path ?? null, "w342");
  const backdrop = tmdbBackdropUrl(tv?.backdrop_path ?? null, "w1280");
  const rating = fmtVote(tv?.vote_average ?? null);
  const whereToWatchHref = buildWhereToWatchHref(tv?.name, tv?.id);

  const nextEpisode = (tv?.next_episode_to_air ?? null) as NextEpisodeLite | null;
  const nextEpisodeCode = formatEpisodeCode(
    nextEpisode?.season_number,
    nextEpisode?.episode_number
  );
  const nextEpisodeDate = formatLongDate(nextEpisode?.air_date);

  const supabaseUrl = mustEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = firstEnv(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_ANON_KEY"
  );

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let providers: ProviderDisplayRow[] | null = null;
  let providerReadError: string | null = null;

  if (tv?.id) {
    try {
      const { error } = await supabase.functions.invoke("sync_show_providers", {
        body: { tmdb_id: Number(tv.id), country: "US" },
      });

      if (error) {
        console.warn("[tv page] sync_show_providers error:", error);
      }
    } catch (e) {
      console.warn("[tv page] sync_show_providers threw:", e);
    }

    try {
      providers = await readProvidersForDisplay(supabase, Number(tv.id), "US");
    } catch (e) {
      console.warn("[tv page] readProvidersForDisplay failed:", e);
      providerReadError =
        e instanceof Error ? e.message : "Failed to load providers";
      providers = null;
    }
  }

  const resolvedProviders = resolvePrimaryProvider(providers ?? []);
  const primaryProvider = resolvedProviders.primary;

  const subscriptionProviders = resolvedProviders.grouped.subscription;
  const freeProviders = resolvedProviders.grouped.free;
  const adsProviders = resolvedProviders.grouped.ads;
  const rentProviders = resolvedProviders.grouped.rent;
  const buyProviders = resolvedProviders.grouped.buy;

  const compactSecondaryProviders = resolvedProviders.secondary.slice(0, 4);
  const moreProviderCount = Math.max(
    0,
    resolvedProviders.secondary.length - compactSecondaryProviders.length
  );

  const streamCount =
    subscriptionProviders.length +
    freeProviders.length +
    adsProviders.length +
    rentProviders.length +
    buyProviders.length;

  return (
    <div className="min-h-screen bg-black text-zinc-50">
      <section className="relative">
        <div className="relative h-[360px] w-full overflow-hidden md:h-[470px]">
          {backdrop ? (
            <Image
              src={backdrop}
              alt={title}
              fill
              priority
              sizes="100vw"
              quality={82}
              unoptimized
              placeholder="blur"
              blurDataURL={shimmerBlurDataURL(1200, 675)}
              className="object-cover opacity-70"
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_55%)]" />
          )}

          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/65 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

          <div className="mx-auto flex h-full w-full max-w-[1200px] items-end px-4 pb-7 sm:px-6 md:pb-10 lg:px-10">
            <div className="flex w-full items-end gap-5 md:gap-6">
              <div className="relative hidden aspect-[2/3] w-[165px] overflow-hidden rounded-3xl bg-white/5 ring-1 ring-white/10 shadow-[0_30px_90px_-50px_rgba(0,0,0,0.95)] md:block lg:w-[185px]">
                {poster ? (
                  <Image
                    src={poster}
                    alt={title}
                    fill
                    sizes="185px"
                    quality={75}
                    unoptimized
                    placeholder="blur"
                    blurDataURL={shimmerBlurDataURL(340, 510)}
                    className="object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_60%)]" />
                )}
              </div>

              <div className="min-w-0 max-w-4xl">
                <div className="text-[11px] font-semibold tracking-[0.22em] text-zinc-400">
                  WATCHWEEK • TV SERIES
                </div>

                <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-5xl">
                  {title}
                </h1>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-zinc-300">
                  {year ? (
                    <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/10">
                      {year}
                    </span>
                  ) : null}

                  {tv?.status ? (
                    <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/10">
                      {tv.status}
                    </span>
                  ) : null}

                  {typeof tv?.number_of_seasons === "number" ? (
                    <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/10">
                      {tv.number_of_seasons} season
                      {tv.number_of_seasons === 1 ? "" : "s"}
                    </span>
                  ) : null}

                  {typeof tv?.number_of_episodes === "number" ? (
                    <span className="rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/10">
                      {tv.number_of_episodes} ep
                    </span>
                  ) : null}

                  {rating ? (
                    <span className="rounded-full bg-white px-3 py-1 font-semibold text-black">
                      ★ {rating}
                    </span>
                  ) : null}
                </div>

                {tv?.tagline ? (
                  <div className="mt-3 italic text-zinc-200/90">
                    “{tv.tagline}”
                  </div>
                ) : null}

                {nextEpisode?.air_date ? (
                  <div className="mt-4">
                    <EpisodeCountdown
                      airDateUTC={nextEpisode.air_date}
                      label="Next Episode"
                    />
                  </div>
                ) : null}

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <Link
                    href="/tv"
                    className="inline-flex h-11 items-center justify-center rounded-2xl bg-white px-4 text-sm font-semibold text-black transition hover:bg-zinc-200"
                  >
                    ← Back to TV
                  </Link>

                  {whereToWatchHref ? (
                    <Link
                      href={whereToWatchHref}
                      className="inline-flex h-11 items-center justify-center rounded-2xl bg-emerald-500 px-4 text-sm font-semibold text-black transition hover:bg-emerald-400"
                    >
                      Full streaming guide →
                    </Link>
                  ) : null}

                  <a
                    href={`https://www.themoviedb.org/tv/${tmdbId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 items-center justify-center rounded-2xl bg-white/10 px-4 text-sm font-semibold ring-1 ring-white/10 transition hover:bg-white/15"
                  >
                    Open in TMDB
                  </a>
                </div>

                {tv?.id ? (
                  <div className="mt-4 max-w-[820px]">
                    <TvDetailActionsClient
                      tmdbId={Number(tv.id)}
                      title={title}
                      whereToWatchHref={whereToWatchHref}
                    />
                  </div>
                ) : null}

                {providers && providers.length > 0 ? (
                  <div className="mt-5 max-w-[820px] rounded-[24px] bg-white/[0.07] p-3.5 ring-1 ring-white/10 backdrop-blur-md sm:p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
                        Streaming snapshot (US)
                      </div>

                      <div className="hidden text-xs text-zinc-500 sm:block">
                        Real provider rows only
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                      <div className="flex flex-col gap-3">
                        {primaryProvider ? (
                          <PrimaryProviderCard
                            provider={primaryProvider}
                            tmdbId={tmdbId}
                            compact
                          />
                        ) : null}

                        {compactSecondaryProviders.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {compactSecondaryProviders.map((provider) => (
                              <ProviderChip
                                key={`${provider.bucket}-${provider.normalizedSlug}`}
                                provider={provider}
                                tmdbId={tmdbId}
                                compact
                              />
                            ))}

                            {whereToWatchHref ? (
                              <Link
                                href={whereToWatchHref}
                                className="inline-flex min-h-10 items-center rounded-2xl bg-white/5 px-3.5 py-2 text-sm font-semibold text-zinc-200 ring-1 ring-white/10 transition hover:bg-white/10"
                              >
                                {moreProviderCount > 0
                                  ? `+${moreProviderCount} more`
                                  : "See all"}
                              </Link>
                            ) : null}
                          </div>
                        ) : null}
                      </div>

                      <div className="grid grid-cols-3 gap-2 md:min-w-[220px]">
                        <SummaryPill
                          label="Streaming"
                          value={subscriptionProviders.length}
                        />
                        <SummaryPill label="Free" value={freeProviders.length} />
                        <SummaryPill label="Ads" value={adsProviders.length} />
                      </div>
                    </div>
                  </div>
                ) : providerReadError ? (
                  <div className="mt-4 text-sm text-zinc-400">
                    Providers unavailable right now:{" "}
                    <span className="font-semibold text-zinc-200">
                      {providerReadError}
                    </span>
                  </div>
                ) : (
                  <div className="mt-4 text-sm text-zinc-400">
                    Providers not available yet for this show.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-[1200px] px-4 pb-14 sm:px-6 lg:px-10">
        {!tv ? (
          <div className="mt-10 rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
            <div className="text-lg font-semibold">Couldn’t load show details</div>
            <div className="mt-2 text-sm text-zinc-400">
              Show ID:{" "}
              <span className="font-semibold text-zinc-100">{tmdbId}</span>
            </div>
          </div>
        ) : (
          <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-6">
              <CardSection title="Overview">
                <p className="text-sm leading-6 text-zinc-300">
                  {tv.overview?.trim()
                    ? tv.overview
                    : "No overview available yet from TMDB."}
                </p>

                {Array.isArray(tv.genres) && tv.genres.length > 0 ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {tv.genres.map((g) => (
                      <span
                        key={g.id}
                        className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-zinc-200 ring-1 ring-white/10"
                      >
                        {g.name}
                      </span>
                    ))}
                  </div>
                ) : null}
              </CardSection>

              {nextEpisode?.air_date ? (
                <CardSection title="Next episode">
                  <div className="flex flex-wrap items-center gap-2">
                    {nextEpisodeCode ? (
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-zinc-200 ring-1 ring-white/10">
                        {nextEpisodeCode}
                      </span>
                    ) : null}
                    {nextEpisodeDate ? (
                      <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-400/20">
                        {nextEpisodeDate}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 text-lg font-semibold text-white">
                    {nextEpisode?.name ?? "Upcoming episode"}
                  </div>

                  {nextEpisode?.overview ? (
                    <p className="mt-3 text-sm leading-6 text-zinc-300">
                      {nextEpisode.overview}
                    </p>
                  ) : (
                    <p className="mt-3 text-sm leading-6 text-zinc-400">
                      Episode details are limited right now, but the release date
                      is already locked.
                    </p>
                  )}
                </CardSection>
              ) : null}

              {providers && providers.length > 0 ? (
                <CardSection title="Streaming options">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-zinc-400">United States</div>
                    <div className="text-sm text-zinc-500">
                      {streamCount} total option{streamCount === 1 ? "" : "s"}
                    </div>
                  </div>

                  {primaryProvider ? (
                    <div className="mt-4">
                      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                        Best option
                      </div>
                      <PrimaryProviderCard provider={primaryProvider} tmdbId={tmdbId} />
                    </div>
                  ) : null}

                  {subscriptionProviders.length > 0 ? (
                    <ProviderGroup
                      title="Streaming"
                      providers={subscriptionProviders}
                      tmdbId={tmdbId}
                    />
                  ) : null}

                  {freeProviders.length > 0 ? (
                    <ProviderGroup
                      title="Free"
                      providers={freeProviders}
                      tmdbId={tmdbId}
                    />
                  ) : null}

                  {adsProviders.length > 0 ? (
                    <ProviderGroup
                      title="With ads"
                      providers={adsProviders}
                      tmdbId={tmdbId}
                    />
                  ) : null}

                  {rentProviders.length > 0 ? (
                    <ProviderGroup
                      title="Rent"
                      providers={rentProviders}
                      tmdbId={tmdbId}
                    />
                  ) : null}

                  {buyProviders.length > 0 ? (
                    <ProviderGroup
                      title="Buy"
                      providers={buyProviders}
                      tmdbId={tmdbId}
                    />
                  ) : null}

                  {whereToWatchHref ? (
                    <div className="mt-5 border-t border-white/10 pt-4">
                      <Link
                        href={whereToWatchHref}
                        className="inline-flex items-center rounded-2xl bg-white/10 px-4 py-2 text-sm font-semibold text-zinc-100 ring-1 ring-white/10 transition hover:bg-white/15"
                      >
                        Open full streaming guide →
                      </Link>
                    </div>
                  ) : null}
                </CardSection>
              ) : null}
            </div>

            <div className="space-y-6">
              <CardSection title="Details">
                <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-x-5 gap-y-3 text-sm">
                  {tv.first_air_date ? (
                    <MetaRow label="First aired" value={tv.first_air_date} />
                  ) : null}

                  {tv.last_air_date ? (
                    <MetaRow label="Last aired" value={tv.last_air_date} />
                  ) : null}

                  {tv.status ? (
                    <MetaRow label="Status" value={tv.status} strong />
                  ) : null}

                  {typeof tv.number_of_seasons === "number" ? (
                    <MetaRow label="Seasons" value={`${tv.number_of_seasons}`} />
                  ) : null}

                  {typeof tv.number_of_episodes === "number" ? (
                    <MetaRow label="Episodes" value={`${tv.number_of_episodes}`} />
                  ) : null}

                  {tv.original_name && tv.original_name !== tv.name ? (
                    <MetaRow label="Original title" value={tv.original_name} />
                  ) : null}

                  {whereToWatchHref ? (
                    <>
                      <div className="text-zinc-500">Streaming guide</div>
                      <div className="min-w-0 text-left">
                        <Link
                          href={whereToWatchHref}
                          className="font-semibold text-emerald-300 underline decoration-emerald-300/20 underline-offset-4 transition hover:text-emerald-200 hover:decoration-emerald-200/40"
                        >
                          Open guide
                        </Link>
                      </div>
                    </>
                  ) : null}

                  {tv.homepage ? (
                    <MetaLinkRow label="Homepage" href={tv.homepage} />
                  ) : null}
                </div>
              </CardSection>

              <CardSection title="WatchWeek read">
                <div className="space-y-3 text-sm leading-6 text-zinc-300">
                  <p>
                    This page is now supposed to do the real job: tell you what
                    the show is, when the next episode lands, where it streams,
                    and let you move it into your WatchWeek flow fast.
                  </p>
                  <p className="text-zinc-400">
                    Use the action panel near the hero to follow or remove this
                    title, then use Calendar and My Stuff as your operating
                    surfaces.
                  </p>
                </div>
              </CardSection>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function CardSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function SummaryPill({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl bg-white/5 px-3 py-2 ring-1 ring-white/10">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function PrimaryProviderCard({
  provider,
  tmdbId,
  compact = false,
}: {
  provider: ResolvedProviderOption;
  tmdbId: string;
  compact?: boolean;
}) {
  const hasDestination = Boolean(provider.affiliateUrl ?? provider.destinationUrl);
  const href = `/api/watch?show=${encodeURIComponent(
    tmdbId
  )}&provider=${encodeURIComponent(provider.serviceSlug)}&surface=tv_page`;

  const wrapperClass = compact
    ? "flex min-h-[64px] items-center gap-3 rounded-[20px] bg-white/10 px-3.5 py-3 ring-1 ring-white/10"
    : "flex min-h-[76px] items-center gap-3 rounded-[24px] bg-white/10 px-4 py-3 ring-1 ring-white/10";

  if (!hasDestination) {
    return (
      <div className={wrapperClass}>
        <ProviderLogo provider={provider} size="lg" />
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white">
            Available on {provider.label}
          </div>
          <div className="mt-1 text-xs text-zinc-400">
            {availabilityLabel(provider.bucket)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <a
      href={href}
      className={
        compact
          ? "group flex min-h-[64px] items-center justify-between gap-4 rounded-[20px] bg-white px-3.5 py-3 text-black transition hover:bg-zinc-200"
          : "group flex min-h-[76px] items-center justify-between gap-4 rounded-[24px] bg-white px-4 py-3 text-black transition hover:bg-zinc-200"
      }
      title={`Watch on ${provider.label}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <ProviderLogo provider={provider} size="lg" darkOnLight />
        <div className="min-w-0">
          <div className="text-sm font-semibold">Watch on {provider.label}</div>
          <div className="mt-1 text-xs text-zinc-600">
            {availabilityLabel(provider.bucket)}
          </div>
        </div>
      </div>

      <div className="shrink-0 text-sm font-semibold text-zinc-700 transition group-hover:translate-x-0.5">
        Open →
      </div>
    </a>
  );
}

function ProviderGroup({
  title,
  providers,
  tmdbId,
}: {
  title: string;
  providers: ResolvedProviderOption[];
  tmdbId: string;
}) {
  if (!providers.length) return null;

  return (
    <div className="mt-4">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        {title}
      </div>
      <div className="flex flex-wrap gap-2.5">
        {providers.map((provider) => (
          <ProviderChip
            key={`${provider.bucket}-${provider.normalizedSlug}`}
            provider={provider}
            tmdbId={tmdbId}
          />
        ))}
      </div>
    </div>
  );
}

function ProviderChip({
  provider,
  tmdbId,
  compact = false,
}: {
  provider: ResolvedProviderOption;
  tmdbId: string;
  compact?: boolean;
}) {
  const hasDestination = Boolean(provider.affiliateUrl ?? provider.destinationUrl);
  const href = `/api/watch?show=${encodeURIComponent(
    tmdbId
  )}&provider=${encodeURIComponent(provider.serviceSlug)}&surface=tv_page`;

  const baseClass = compact
    ? "inline-flex min-h-10 items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold"
    : "inline-flex min-h-11 items-center gap-2 rounded-2xl px-3.5 py-2 text-sm font-semibold";

  if (hasDestination) {
    return (
      <a
        href={href}
        className={`${baseClass} bg-white/10 text-zinc-100 ring-1 ring-white/10 transition hover:bg-white/15`}
        title={`Watch on ${provider.label}`}
      >
        <ProviderLogo provider={provider} size="sm" />
        <span className="whitespace-nowrap">
          {compact ? provider.label : `Watch on ${provider.label}`}
        </span>
      </a>
    );
  }

  return (
    <div
      className={`${baseClass} bg-white/[0.06] text-zinc-200 ring-1 ring-white/10`}
      title={`${availabilityLabel(provider.bucket)} on ${provider.label}`}
    >
      <ProviderLogo provider={provider} size="sm" />
      <span className="whitespace-nowrap">
        {compact ? provider.label : `Available on ${provider.label}`}
      </span>
    </div>
  );
}

function ProviderLogo({
  provider,
  size,
  darkOnLight = false,
}: {
  provider: ResolvedProviderOption;
  size: "sm" | "lg";
  darkOnLight?: boolean;
}) {
  const wrapperClass =
    size === "lg"
      ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black/5 ring-1 ring-black/5"
      : "flex h-6 w-6 shrink-0 items-center justify-center rounded-md";

  const imgClass =
    size === "lg"
      ? "max-h-7 w-auto object-contain"
      : "max-h-4 w-auto object-contain";

  if (provider.logoUrl) {
    return (
      <div
        className={
          darkOnLight
            ? wrapperClass
            : "flex shrink-0 items-center justify-center"
        }
      >
        <Image
          src={provider.logoUrl}
          alt={provider.label}
          width={size === "lg" ? 28 : 16}
          height={size === "lg" ? 28 : 16}
          unoptimized
          className={imgClass}
        />
      </div>
    );
  }

  return (
    <div
      className={[
        size === "lg"
          ? "flex h-11 min-w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 px-2 text-[10px]"
          : "flex h-6 min-w-6 shrink-0 items-center justify-center rounded-md bg-white/10 px-1.5 text-[9px]",
        darkOnLight ? "bg-black/8 text-black" : "text-zinc-300",
      ].join(" ")}
      title={provider.label}
    >
      <span className="max-w-full truncate font-bold uppercase">
        {provider.label.slice(0, size === "lg" ? 3 : 2)}
      </span>
    </div>
  );
}

function MetaRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <>
      <div className="text-zinc-500">{label}</div>
      <div
        className={[
          "min-w-0 text-left text-zinc-200",
          strong ? "font-semibold" : "",
        ].join(" ")}
      >
        {value}
      </div>
    </>
  );
}

function MetaLinkRow({
  label,
  href,
}: {
  label: string;
  href: string;
}) {
  return (
    <>
      <div className="text-zinc-500">{label}</div>
      <div className="min-w-0 text-left">
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="break-all font-semibold text-zinc-200 underline decoration-white/15 underline-offset-4 transition hover:text-white hover:decoration-white/40"
        >
          {href}
        </a>
      </div>
    </>
  );
}