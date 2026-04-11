"use client";

import { useAuth } from "@/components/AuthProvider";
import {
  getThisWeekDrops,
  getBecauseYouFollow,
  getProviderRails,
  type ReleaseItem,
} from "@/lib/tv/queries";

import Link from "next/link";
import Image from "next/image";
import React, { useEffect, useMemo, useState } from "react";

import PageShell from "@/components/PageShell";
import PageWrap from "@/components/PageWrap";

import {
  tmdbGetTrendingTv,
  tmdbPosterUrl,
  tmdbSearchTv,
  type TmdbSearchTvResult,
} from "@/lib/tmdb";
import { shimmerBlurDataURL } from "@/lib/imagePlaceholders";

type TvCardItem = {
  id: number;
  title: string;
  posterUrl?: string;
  firstAirDate?: string;
};

function formatYear(value?: string) {
  if (!value) return "";
  const year = new Date(value).getFullYear();
  return Number.isFinite(year) ? String(year) : "";
}

function getTodayLocalDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function TvPage() {
  const { userId, loading: authLoading } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<TmdbSearchTvResult[]>([]);

  const [trendingDay, setTrendingDay] = useState<TvCardItem[]>([]);
  const [trendingWeek, setTrendingWeek] = useState<TvCardItem[]>([]);
  const [loadingDay, setLoadingDay] = useState(true);
  const [loadingWeek, setLoadingWeek] = useState(true);

  const [thisWeekDrops, setThisWeekDrops] = useState<ReleaseItem[]>([]);
  const [becauseYouFollow, setBecauseYouFollow] = useState<ReleaseItem[]>([]);
  const [providerRails, setProviderRails] = useState<
    Record<string, ReleaseItem[]>
  >({});
  const [loadingDrops, setLoadingDrops] = useState(true);
  const [loadingFollowing, setLoadingFollowing] = useState(true);
  const [loadingProviderRails, setLoadingProviderRails] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadTrendingDay() {
      try {
        setLoadingDay(true);
        const items = await tmdbGetTrendingTv(12, "day");
        if (cancelled) return;

        setTrendingDay(
          items.map((item) => ({
            id: Number(item.id),
            title: item.title,
            posterUrl: item.posterUrl,
            firstAirDate: item.firstAirDate,
          }))
        );
      } catch {
        if (!cancelled) setTrendingDay([]);
      } finally {
        if (!cancelled) setLoadingDay(false);
      }
    }

    void loadTrendingDay();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadCoreReleaseData() {
      try {
        setLoadingDrops(true);
        setLoadingFollowing(Boolean(userId));

        const [drops, followed] = await Promise.all([
          getThisWeekDrops().catch(() => []),
          userId ? getBecauseYouFollow(userId).catch(() => []) : Promise.resolve([]),
        ]);

        if (cancelled) return;

        setThisWeekDrops(drops);
        setBecauseYouFollow(followed);
      } finally {
        if (!cancelled) {
          setLoadingDrops(false);
          setLoadingFollowing(false);
        }
      }
    }

    void loadCoreReleaseData();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    let cancelled = false;

    const timer = window.setTimeout(() => {
      void loadDeferredData();
    }, 150);

    async function loadDeferredData() {
      try {
        setLoadingWeek(true);
        setLoadingProviderRails(true);

        const [weekItems, rails] = await Promise.all([
          tmdbGetTrendingTv(12, "week").catch(() => []),
          getProviderRails().catch(() => ({})),
        ]);

        if (cancelled) return;

        setTrendingWeek(
          weekItems.map((item) => ({
            id: Number(item.id),
            title: item.title,
            posterUrl: item.posterUrl,
            firstAirDate: item.firstAirDate,
          }))
        );

        setProviderRails(rails);
      } finally {
        if (!cancelled) {
          setLoadingWeek(false);
          setLoadingProviderRails(false);
        }
      }
    }

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const q = searchQuery.trim();

    if (q.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);

    const timer = window.setTimeout(() => {
      void runSearch();
    }, 300);

    async function runSearch() {
      try {
        const results = await tmdbSearchTv(q);
        if (cancelled) return;
        setSearchResults(results.slice(0, 12));
      } catch {
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchQuery]);

  const mappedSearchResults = useMemo<TvCardItem[]>(() => {
    return searchResults.map((item) => ({
      id: item.id,
      title: item.name,
      posterUrl: tmdbPosterUrl(item.poster_path, "w342") ?? undefined,
      firstAirDate: item.first_air_date,
    }));
  }, [searchResults]);

  const heroItem = trendingDay[0];
  const momentumItems = trendingWeek.slice(0, 6);

  const providerRailEntries = useMemo(() => {
    return Object.entries(providerRails)
      .map(([provider, items]) => [provider, items] as const)
      .filter(([, items]) => Array.isArray(items) && items.length > 0);
  }, [providerRails]);

  const todayDate = useMemo(() => getTodayLocalDateString(), []);
  const tonightDropsCount = useMemo(() => {
    return thisWeekDrops.filter((item) => item.air_date === todayDate).length;
  }, [thisWeekDrops, todayDate]);

  const heroInsightUpcomingItems = useMemo(() => {
    const preferred =
      userId && becauseYouFollow.length > 0 ? becauseYouFollow : thisWeekDrops;

    return preferred.slice(0, 3);
  }, [becauseYouFollow, thisWeekDrops, userId]);

  return (
    <PageShell>
      <main className="pb-16 md:pb-20">
        <PageWrap className="py-6 md:py-8">
          <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[#0b0f14] shadow-[0_40px_120px_-55px_rgba(0,0,0,0.95)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_18%,rgba(34,197,94,0.22),transparent_28%),radial-gradient(circle_at_88%_16%,rgba(255,255,255,0.08),transparent_22%),radial-gradient(circle_at_62%_100%,rgba(16,185,129,0.12),transparent_34%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01),rgba(0,0,0,0.18))]" />
            <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(0,0,0,0.2),rgba(0,0,0,0.52))]" />

            <div className="relative grid gap-6 p-5 md:p-7 xl:grid-cols-[minmax(0,1.08fr)_420px] xl:p-8">
              <div className="flex flex-col gap-5 xl:pr-2">
                <div>
                  <div className="inline-flex w-fit items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-300">
                    WatchWeek TV
                  </div>

                  <h1 className="mt-4 max-w-[11ch] text-4xl font-semibold leading-[0.92] tracking-[-0.06em] text-white sm:text-5xl md:text-6xl xl:text-[72px]">
                    What dropped.
                    <span className="block text-white/72">What’s next.</span>
                    <span className="block text-white/72">What matters.</span>
                  </h1>

                  <p className="mt-4 max-w-2xl text-sm leading-7 text-white/68 md:text-base">
                    Real TV discovery powered by live TMDB data and your actual
                    follows. Search titles, see what is dropping this week, and
                    track what is coming next from the shows you care about.
                  </p>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      href={userId ? "/library" : "/login"}
                      className="inline-flex h-11 items-center justify-center rounded-2xl bg-white px-4 text-sm font-semibold text-black transition hover:bg-zinc-200"
                    >
                      {userId ? "Open My Stuff" : "Start following shows"}
                    </Link>

                    <Link
                      href="/calendar"
                      className="inline-flex h-11 items-center justify-center rounded-2xl bg-white/[0.05] px-4 text-sm font-medium text-white ring-1 ring-white/10 transition hover:bg-white/[0.08]"
                    >
                      Open calendar
                    </Link>

                    <Link
                      href="/tv"
                      className="inline-flex h-11 items-center justify-center rounded-2xl px-2 text-sm font-medium text-white/68 transition hover:text-white"
                    >
                      Browse TV
                    </Link>
                  </div>
                </div>

                <div className="overflow-hidden rounded-[26px] border border-white/10 bg-black/28 p-3 backdrop-blur-md">
                  <div className="flex flex-col gap-3 lg:flex-row">
                    <div className="relative flex-1">
                      <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-white/30">
                        <SearchIcon />
                      </div>

                      <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search TV titles, franchises, networks, and genres"
                        className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] pl-11 pr-4 text-sm text-white outline-none placeholder:text-white/35"
                      />
                    </div>

                    <Link
                      href={userId ? "/library" : "/portal"}
                      className="inline-flex h-12 items-center justify-center rounded-2xl bg-emerald-400/12 px-4 text-sm font-medium text-emerald-300 ring-1 ring-emerald-400/20 transition hover:bg-emerald-400/16"
                    >
                      {userId ? "Manage follows" : "Unlock personalization"}
                    </Link>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <CompactStatCard
                    label="New This Week"
                    value={loadingDrops ? "…" : `${thisWeekDrops.length}`}
                    sub="next 7 days"
                  />
                  <CompactStatCard
                    label="Search"
                    value={searchQuery.trim().length >= 2 ? "Active" : "Ready"}
                    sub="live TMDB"
                  />
                  <CompactStatCard
                    label="Because You Follow"
                    value={
                      authLoading
                        ? "…"
                        : userId
                          ? `${becauseYouFollow.length}`
                          : "Locked"
                    }
                    sub={userId ? "next 30 days" : "sign in"}
                  />
                </div>
              </div>

              <div className="grid gap-4">
                <HeroShowcaseCard item={heroItem} loading={loadingDay} />

                <HeroSecondaryModule
                  loading={
                    loadingDrops ||
                    authLoading ||
                    (userId ? loadingFollowing : false)
                  }
                  tonightDropsCount={tonightDropsCount}
                  thisWeekDropsCount={thisWeekDrops.length}
                  followedShowsCount={userId ? becauseYouFollow.length : null}
                  upcomingItems={heroInsightUpcomingItems}
                  userId={userId}
                />
              </div>
            </div>
          </section>

          {searchQuery.trim().length >= 2 ? (
            <section className="pt-6">
              <RailHeader
                title="Search Results"
                subtitle={
                  searching
                    ? "Searching TMDB…"
                    : mappedSearchResults.length
                      ? `Results for “${searchQuery.trim()}”`
                      : `No results for “${searchQuery.trim()}”`
                }
              />

              {searching ? (
                <PosterRailSkeleton count={8} />
              ) : mappedSearchResults.length ? (
                <PosterRail items={mappedSearchResults} />
              ) : (
                <EmptyStateCard label="Try a different title, franchise, or keyword." />
              )}
            </section>
          ) : null}

          <section className="pt-6">
            <RailHeader
              title="New This Week"
              subtitle="Upcoming TV releases in the next 7 days"
            />

            {loadingDrops ? (
              <PosterRailSkeleton count={8} />
            ) : thisWeekDrops.length ? (
              <ReleaseRail items={thisWeekDrops} />
            ) : (
              <EmptyStateCard label="No real TV drops found for the next 7 days." />
            )}
          </section>

          <section className="pt-6">
            <RailHeader
              title="Because You Follow"
              subtitle={
                userId
                  ? "Upcoming episodes from the shows you track"
                  : "Personalized release tracking for your followed shows"
              }
            />

            {!userId && !authLoading ? (
              <PersonalizationUpsellCard />
            ) : loadingFollowing || authLoading ? (
              <PosterRailSkeleton count={6} />
            ) : becauseYouFollow.length ? (
              <ReleaseRail items={becauseYouFollow} />
            ) : (
              <FollowEmptyState />
            )}
          </section>

          {loadingProviderRails ? (
            <section className="pt-6">
              <RailHeader
                title="New on your services"
                subtitle="Loading real provider release rails"
              />
              <PosterRailSkeleton count={6} />
            </section>
          ) : null}

          {!loadingProviderRails &&
            providerRailEntries.map(([provider, items]) => (
              <section key={provider} className="pt-6">
                <RailHeader
                  title={`New on ${provider}`}
                  subtitle={`Upcoming releases tied to real ${provider} provider data`}
                />
                <ReleaseRail items={items} />
              </section>
            ))}

          <section className="pt-6">
            <RailHeader
              title="Trending Now"
              subtitle="What people are actively checking right now"
            />

            {loadingDay ? (
              <PosterRailSkeleton count={8} />
            ) : trendingDay.length ? (
              <PosterRail items={trendingDay} />
            ) : (
              <EmptyStateCard label="Trending titles could not be loaded right now." />
            )}
          </section>

          <section className="pt-6">
            <SurfaceCard className="overflow-hidden p-0">
              <div className="border-b border-white/10 px-6 py-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/35">
                  Weekly momentum
                </div>
                <h2 className="mt-2 text-[22px] font-semibold tracking-tight text-white">
                  Breakout this week
                </h2>
                <div className="mt-1 text-sm text-white/45">
                  Trending titles across the weekly window
                </div>
              </div>

              <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
                {loadingWeek
                  ? Array.from({ length: 6 }).map((_, index) => (
                      <WideMediaCardSkeleton key={index} />
                    ))
                  : momentumItems.map((item) => (
                      <WideMediaCard key={item.id} item={item} />
                    ))}
              </div>
            </SurfaceCard>
          </section>

          <section className="pt-6">
            <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(34,197,94,0.14),rgba(255,255,255,0.03),rgba(0,0,0,0.25))] p-6 shadow-[0_24px_80px_-50px_rgba(0,0,0,0.95)]">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">
                    WatchWeek
                  </div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">
                    Track TV with a real calendar underneath
                  </div>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-white/68">
                    Follow shows, keep up with upcoming releases, and turn
                    streaming into something clear instead of scattered.
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2.5">
                    <FeaturePill label="Followed-show tracking" />
                    <FeaturePill label="Weekly releases" />
                    <FeaturePill label="Live search" />
                    <FeaturePill label="Cross-device sync" />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href={userId ? "/library" : "/portal"}
                    className="inline-flex h-11 items-center justify-center rounded-2xl bg-white px-4 text-sm font-semibold text-black transition hover:bg-zinc-200"
                  >
                    {userId ? "Open My Stuff" : "Upgrade"}
                  </Link>
                  <Link
                    href="/about"
                    className="inline-flex h-11 items-center justify-center rounded-2xl bg-black/20 px-4 text-sm font-medium text-white ring-1 ring-white/10 transition hover:bg-black/28"
                  >
                    About WatchWeek
                  </Link>
                </div>
              </div>
            </div>
          </section>

          <section className="pt-6">
            <div className="grid gap-4 lg:grid-cols-3">
              <MiniInfoCard
                title="Support"
                body="Get help using WatchWeek and understand how tracking, reminders, and navigation work."
                href="/support"
                cta="Open support"
              />
              <MiniInfoCard
                title="About us"
                body="WatchWeek is built to solve the release-timing problem across streaming services."
                href="/about"
                cta="Read our mission"
              />
              <MiniInfoCard
                title="My Stuff"
                body="Manage your follows and keep the shows you care about in one place."
                href="/library"
                cta="Open My Stuff"
              />
            </div>
          </section>
        </PageWrap>
      </main>
    </PageShell>
  );
}

function RailHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h2 className="text-[22px] font-semibold tracking-tight text-white">
          {title}
        </h2>
        <div className="mt-1 text-sm text-white/45">{subtitle}</div>
      </div>
    </div>
  );
}

function PosterRail({ items }: { items: TvCardItem[] }) {
  return (
    <div className="-mx-4 mt-5 overflow-x-auto overflow-y-visible pb-2 [scrollbar-width:none] [-ms-overflow-style:none] sm:-mx-6 lg:-mx-10 [&::-webkit-scrollbar]:hidden">
      <div className="flex w-max gap-4 px-4 pr-10 sm:px-6 lg:px-10">
        {items.map((item) => (
          <TvPosterCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function ReleaseRail({ items }: { items: ReleaseItem[] }) {
  return (
    <div className="-mx-4 mt-5 overflow-x-auto overflow-y-visible pb-2 [scrollbar-width:none] [-ms-overflow-style:none] sm:-mx-6 lg:-mx-10 [&::-webkit-scrollbar]:hidden">
      <div className="flex w-max gap-4 px-4 pr-10 sm:px-6 lg:px-10">
        {items.map((item) => (
          <ReleaseCard key={`${item.show_id}-${item.air_date}`} item={item} />
        ))}
      </div>
    </div>
  );
}

function PosterRailSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="-mx-4 mt-5 overflow-x-auto overflow-y-visible pb-2 [scrollbar-width:none] [-ms-overflow-style:none] sm:-mx-6 lg:-mx-10 [&::-webkit-scrollbar]:hidden">
      <div className="flex w-max gap-4 px-4 pr-10 sm:px-6 lg:px-10">
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className="w-[172px] shrink-0 overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04]"
          >
            <div className="aspect-[2/3] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015))]" />
            <div className="p-3">
              <div className="h-4 w-3/4 rounded bg-white/10" />
              <div className="mt-2 h-3 w-1/3 rounded bg-white/10" />
              <div className="mt-3 h-9 rounded-xl bg-white/10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TvPosterCard({ item }: { item: TvCardItem }) {
  const year = formatYear(item.firstAirDate);

  return (
    <div className="group w-[172px] shrink-0">
      <Link href={`/tv/${item.id}`} className="block">
        <div className="relative aspect-[2/3] overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04] shadow-[0_24px_70px_-50px_rgba(0,0,0,0.95)] transition duration-300 group-hover:-translate-y-1 group-hover:scale-[1.02] group-hover:border-white/20 group-hover:shadow-[0_28px_90px_-45px_rgba(0,0,0,0.95)]">
          {item.posterUrl ? (
            <Image
              src={item.posterUrl}
              alt={item.title}
              fill
              sizes="172px"
              quality={76}
              unoptimized
              placeholder="blur"
              blurDataURL={shimmerBlurDataURL(336, 504)}
              className="object-cover transition duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]" />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-85" />
          <div className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/35 px-2.5 py-1 text-[11px] font-medium text-white/82 backdrop-blur-md">
            TV
          </div>
        </div>
      </Link>

      <div className="mt-3">
        <div className="line-clamp-2 text-sm font-semibold text-white">
          {item.title}
        </div>
        <div className="mt-1 text-xs text-white/45">{year || "Series"}</div>

        <div className="mt-3 flex gap-2">
          <Link
            href={`/tv/${item.id}`}
            className="inline-flex h-9 flex-1 items-center justify-center rounded-xl bg-white px-3 text-xs font-semibold text-black transition hover:bg-zinc-200"
          >
            View
          </Link>
          <Link
            href="/login"
            className="inline-flex h-9 items-center justify-center rounded-xl bg-white/[0.05] px-3 text-xs font-medium text-white ring-1 ring-white/10 transition hover:bg-white/[0.08]"
          >
            Follow
          </Link>
        </div>
      </div>
    </div>
  );
}

function ReleaseCard({ item }: { item: ReleaseItem }) {
  return (
    <div className="group w-[220px] shrink-0">
      <Link href={`/tv/${item.show_id}`} className="block">
        <div className="relative aspect-[2/3] overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04] shadow-[0_24px_70px_-50px_rgba(0,0,0,0.95)] transition duration-300 group-hover:-translate-y-1 group-hover:scale-[1.02] group-hover:border-white/20">
          {item.posterUrl ? (
            <Image
              src={item.posterUrl}
              alt={item.title}
              fill
              sizes="220px"
              quality={76}
              unoptimized
              placeholder="blur"
              blurDataURL={shimmerBlurDataURL(336, 504)}
              className="object-cover transition duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]" />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

          <div className="absolute left-3 top-3 rounded-full border border-emerald-400/20 bg-emerald-400/12 px-2.5 py-1 text-[11px] font-medium text-emerald-300 backdrop-blur-md">
            {formatReleaseDate(item.air_date)}
          </div>

          {item.provider ? (
            <div className="absolute bottom-3 left-3 rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[11px] font-medium text-white/82 backdrop-blur-md">
              {item.provider}
            </div>
          ) : null}
        </div>
      </Link>

      <div className="mt-3">
        <div className="line-clamp-2 text-sm font-semibold text-white">
          {item.title}
        </div>
        <div className="mt-1 text-xs text-white/50">
          {item.provider ? `Episode drop • ${item.provider}` : "Episode drop"}
        </div>
        <div className="mt-3 flex gap-2">
          <Link
            href={`/tv/${item.show_id}`}
            className="inline-flex h-9 flex-1 items-center justify-center rounded-xl bg-white px-3 text-xs font-semibold text-black transition hover:bg-zinc-200"
          >
            View
          </Link>
          <Link
            href="/login"
            className="inline-flex h-9 items-center justify-center rounded-xl bg-white/[0.05] px-3 text-xs font-medium text-white ring-1 ring-white/10 transition hover:bg-white/[0.08]"
          >
            Follow
          </Link>
        </div>
      </div>
    </div>
  );
}

function HeroShowcaseCard({
  item,
  loading,
}: {
  item?: TvCardItem;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="relative min-h-[360px] overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04]">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015))]" />
        <div className="relative flex h-full flex-col justify-end p-5">
          <div className="h-3 w-24 rounded bg-white/10" />
          <div className="mt-3 h-10 w-2/3 rounded bg-white/10" />
          <div className="mt-3 h-4 w-full rounded bg-white/10" />
          <div className="mt-2 h-4 w-5/6 rounded bg-white/10" />
          <div className="mt-5 flex gap-2">
            <div className="h-10 w-28 rounded-2xl bg-white/10" />
            <div className="h-10 w-36 rounded-2xl bg-white/10" />
          </div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-6">
        <div className="text-sm text-white/62">
          Featured TV could not be loaded.
        </div>
      </div>
    );
  }

  return (
    <div className="group relative min-h-[360px] overflow-hidden rounded-[30px] border border-white/10 bg-[#11161d] shadow-[0_30px_90px_-45px_rgba(0,0,0,0.95)]">
      {item.posterUrl ? (
        <Image
          src={item.posterUrl}
          alt={item.title}
          fill
          sizes="420px"
          quality={80}
          unoptimized
          placeholder="blur"
          blurDataURL={shimmerBlurDataURL(500, 750)}
          className="object-cover object-top opacity-88 scale-100 transition duration-700 group-hover:scale-[1.02]"
        />
      ) : null}

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.18),transparent_26%)]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.04),rgba(0,0,0,0.76))]" />

      <div className="relative flex h-full flex-col justify-end p-5 md:p-6">
        <div className="inline-flex w-fit items-center rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/76 backdrop-blur-md">
          Featured now
        </div>

        <h2 className="mt-4 max-w-[12ch] text-3xl font-semibold leading-[0.95] tracking-[-0.04em] text-white md:text-4xl">
          {item.title}
        </h2>

        <p className="mt-3 max-w-xl text-sm leading-7 text-white/70">
          One of the most watched shows right now. Jump in or follow it to
          track every upcoming episode.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href={`/tv/${item.id}`}
            className="inline-flex h-10 items-center justify-center rounded-2xl bg-white px-4 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            View series
          </Link>
          <Link
            href="/login"
            className="inline-flex h-10 items-center justify-center rounded-2xl bg-white/[0.06] px-4 text-sm font-medium text-white ring-1 ring-white/10 transition hover:bg-white/[0.08]"
          >
            Follow show
          </Link>
        </div>
      </div>
    </div>
  );
}

function HeroSecondaryModule({
  loading,
  tonightDropsCount,
  thisWeekDropsCount,
  followedShowsCount,
  upcomingItems,
  userId,
}: {
  loading: boolean;
  tonightDropsCount: number;
  thisWeekDropsCount: number;
  followedShowsCount: number | null;
  upcomingItems: ReleaseItem[];
  userId?: string | null;
}) {
  if (loading) {
    return (
      <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] p-5 backdrop-blur-md">
        <div className="h-3 w-24 rounded bg-white/10" />
        <div className="mt-3 h-7 w-1/2 rounded bg-white/10" />

        <div className="mt-5 grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="rounded-[18px] border border-white/10 bg-white/[0.03] p-3"
            >
              <div className="h-3 w-12 rounded bg-white/10" />
              <div className="mt-2 h-6 w-8 rounded bg-white/10" />
              <div className="mt-2 h-3 w-10 rounded bg-white/10" />
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-[22px] border border-white/10 bg-black/18 p-4">
          <div className="h-3 w-16 rounded bg-white/10" />
          <div className="mt-4 space-y-3">
            <div className="h-4 w-full rounded bg-white/10" />
            <div className="h-4 w-5/6 rounded bg-white/10" />
            <div className="h-4 w-2/3 rounded bg-white/10" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025),rgba(255,255,255,0.015))] p-5 shadow-[0_28px_80px_-55px_rgba(0,0,0,0.95)] backdrop-blur-md">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.14),transparent_28%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.02),transparent_45%,rgba(0,0,0,0.12))]" />

      <div className="relative">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/38">
          Your TV pulse
        </div>

        <div className="mt-2 text-xl font-semibold tracking-tight text-white">
          What matters next
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <InsightStatTile
            label="Tonight"
            value={`${tonightDropsCount}`}
            sub={tonightDropsCount === 1 ? "drop" : "drops"}
          />
          <InsightStatTile
            label="This week"
            value={`${thisWeekDropsCount}`}
            sub="scheduled"
          />
          <InsightStatTile
            label="Following"
            value={userId ? `${followedShowsCount ?? 0}` : "—"}
            sub={userId ? "tracked" : "sign in"}
          />
        </div>

        <div className="mt-5 rounded-[22px] border border-white/10 bg-black/18 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
            Up next
          </div>

          {upcomingItems.length ? (
            <div className="mt-3 space-y-3">
              {upcomingItems.map((item) => (
                <Link
                  key={`${item.show_id}-${item.air_date}-line`}
                  href={`/tv/${item.show_id}`}
                  className="flex items-start justify-between gap-3 rounded-2xl transition hover:bg-white/[0.03]"
                >
                  <div className="min-w-0">
                    <div className="line-clamp-1 text-sm font-medium text-white">
                      {item.title}
                    </div>
                    <div className="mt-1 text-xs text-white/50">
                      {item.provider
                        ? `${formatReleaseDate(item.air_date)} • ${item.provider}`
                        : formatReleaseDate(item.air_date)}
                    </div>
                  </div>
                  <div className="pt-0.5 text-xs font-medium text-emerald-300">
                    View
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-3 text-sm text-white/52">
              No upcoming live releases available right now.
            </div>
          )}
        </div>

        {!userId ? (
          <div className="mt-4 text-xs text-white/44">
            Sign in to turn this into a personal release snapshot.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function InsightStatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-white/[0.035] p-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
        {label}
      </div>
      <div className="mt-1.5 text-lg font-semibold text-white">{value}</div>
      <div className="mt-1 text-[11px] text-white/50">{sub}</div>
    </div>
  );
}

function WideMediaCard({ item }: { item: TvCardItem }) {
  const year = formatYear(item.firstAirDate);

  return (
    <Link
      href={`/tv/${item.id}`}
      className="group flex gap-3 overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03] p-3 transition duration-300 hover:-translate-y-0.5 hover:border-white/18 hover:bg-white/[0.05]"
    >
      <div className="relative h-[112px] w-[76px] shrink-0 overflow-hidden rounded-[16px] bg-white/[0.05]">
        {item.posterUrl ? (
          <Image
            src={item.posterUrl}
            alt={item.title}
            fill
            sizes="76px"
            quality={70}
            unoptimized
            placeholder="blur"
            blurDataURL={shimmerBlurDataURL(152, 228)}
            className="object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-white">{item.title}</div>
        <div className="mt-1 text-xs text-white/45">{year || "TV series"}</div>
        <div className="mt-3 text-sm leading-6 text-white/60">
          Trending this week.
        </div>
      </div>
    </Link>
  );
}

function WideMediaCardSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03] p-3">
      <div className="h-[112px] w-[76px] shrink-0 rounded-[16px] bg-white/10" />
      <div className="min-w-0 flex-1">
        <div className="h-4 w-2/3 rounded bg-white/10" />
        <div className="mt-2 h-3 w-1/3 rounded bg-white/10" />
        <div className="mt-3 h-3 w-full rounded bg-white/10" />
        <div className="mt-2 h-3 w-5/6 rounded bg-white/10" />
      </div>
    </div>
  );
}

function PersonalizationUpsellCard() {
  return (
    <div className="mt-5 overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(34,197,94,0.12),rgba(255,255,255,0.03),rgba(0,0,0,0.18))] p-5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">
        Personalized TV
      </div>
      <div className="mt-2 text-xl font-semibold text-white">
        See what’s dropping for you
      </div>
      <div className="mt-2 text-sm leading-7 text-white/65">
        Sign in to unlock upcoming episode tracking from the shows you follow.
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href="/login"
          className="inline-flex h-10 items-center justify-center rounded-2xl bg-white px-4 text-sm font-semibold text-black transition hover:bg-zinc-200"
        >
          Sign in
        </Link>
        <Link
          href="/portal"
          className="inline-flex h-10 items-center justify-center rounded-2xl bg-white/[0.05] px-4 text-sm font-medium text-white ring-1 ring-white/10 transition hover:bg-white/[0.08]"
        >
          Unlock premium
        </Link>
      </div>
    </div>
  );
}

function FollowEmptyState() {
  return (
    <div className="mt-5 overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(34,197,94,0.08),rgba(255,255,255,0.02),rgba(0,0,0,0.25))] p-6">
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">
        Because You Follow
      </div>

      <div className="mt-2 text-xl font-semibold text-white">
        Nothing dropping yet
      </div>

      <div className="mt-2 text-sm text-white/65">
        You’re tracking shows, but nothing is scheduled in the next 30 days.
      </div>

      <div className="mt-4 text-sm text-white/55">
        Add more shows or check back soon. This is where your upcoming episodes
        will appear.
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href="/tv"
          className="inline-flex h-10 items-center justify-center rounded-2xl bg-white px-4 text-sm font-semibold text-black transition hover:bg-zinc-200"
        >
          Browse shows
        </Link>

        <Link
          href="/library"
          className="inline-flex h-10 items-center justify-center rounded-2xl bg-white/[0.05] px-4 text-sm text-white ring-1 ring-white/10 transition hover:bg-white/[0.08]"
        >
          Manage follows
        </Link>
      </div>
    </div>
  );
}

function EmptyStateCard({ label }: { label: string }) {
  return (
    <div className="mt-5 rounded-[28px] border border-white/10 bg-white/[0.04] p-5 text-sm text-white/60">
      {label}
    </div>
  );
}

function SurfaceCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm ${className}`}
    >
      {children}
    </div>
  );
}

function MiniInfoCard({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5">
      <div className="text-lg font-semibold text-white">{title}</div>
      <div className="mt-2 text-sm leading-7 text-white/60">{body}</div>
      <div className="mt-5">
        <Link
          href={href}
          className="inline-flex h-10 items-center justify-center rounded-2xl bg-white/[0.05] px-4 text-sm font-medium text-white ring-1 ring-white/10 transition hover:bg-white/[0.08]"
        >
          {cta}
        </Link>
      </div>
    </div>
  );
}

function CompactStatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-3.5 backdrop-blur-sm">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
        {label}
      </div>
      <div className="mt-1.5 text-lg font-semibold text-white">{value}</div>
      <div className="mt-1 text-xs text-white/55">{sub}</div>
    </div>
  );
}

function FeaturePill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-medium text-white/82">
      {label}
    </span>
  );
}

function formatReleaseDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}