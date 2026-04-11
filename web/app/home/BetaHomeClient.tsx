"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import PageShell from "@/components/PageShell";
import PageWrap from "@/components/PageWrap";
import Rail from "@/components/Rail";
import ContinueWatchingTile from "@/components/ContinueWatchingTile";
import StartingSoonRail from "@/components/StartingSoonRail";
import BecauseYouFollowRail from "@/components/BecauseYouFollowRail";
import TodayTimeline from "@/components/TodayTimeline";
import HeroCountdown from "@/components/HeroCountdown";

import { createClient } from "@/lib/supabase-browser";
import { useCountry } from "@/lib/country";
import { useAuth } from "@/components/AuthProvider";
import { shimmerBlurDataURL } from "@/lib/imagePlaceholders";

import {
  tmdbBackdropUrl,
  tmdbGetTrendingTv,
  tmdbPosterUrl,
  tmdbSearchTv,
  type TmdbSearchTvResult,
} from "@/lib/tmdb";

import { buildHomeExperience } from "@/lib/home/globalDropEngine";
import {
  normalizeFollowedShow,
  normalizeRecommendedItem,
  normalizeTrendingItem,
} from "@/lib/home/normalizeCandidate";
import {
  type EpisodeScheduleRow,
  type FollowedShow,
  type TrendingItem,
} from "@/lib/home/selectHero";
import {
  candidateToFollowedShow,
  getUsableImageUrl,
  resolveCandidateArtwork,
  resolveShowArtwork,
} from "@/lib/home/resolveArtwork";
import { normalizeEpisodeCandidate } from "@/lib/home/normalizeEpisodeCandidate";
import type { HomeCandidate } from "@/lib/home/types";

import {
  ALL_PROVIDERS,
  LS_FOLLOWED_BASE,
  LS_PROVIDERS_BASE,
  type CandidateCardModel,
  type RecommendedItem,
  type SafeHomeExperience,
  type SelectableProviderKey,
  type UserUpcomingEpisodeRow,
} from "./types";

import {
  firstFutureCard,
  formatDowMonthDay,
  formatTime,
  hoursFromNowLabel,
  isValidIsoDate,
  normalizeTitleKey,
  sanitizeStoredFollowed,
  sanitizeStoredProviders,
  uniqueCards,
} from "./utils";

import {
  buildHeroViewModel,
  getCandidateDate,
  heroSupportLabel,
} from "./heroViewModel";

import {
  CompactUtilityCard,
  ensureKeyframes,
  FeaturedDropTonightCompact,
  HeroStagePanel,
  HomePosterTile,
  Modal,
  ProviderPill,
  QueuePeekStrip,
  QuickToolsCard,
  ReleaseStripCard,
  SectionHeader,
  SignedOutPromoRail,
  TrendingPosterShelf,
  WeekEditorialList,
} from "./HomeComponents";

const FOLLOWED_LIMIT = 3;

function hasUsableTrendingImage(item: TrendingItem | null | undefined) {
  if (!item) return false;
  return Boolean(getUsableImageUrl(item.backdropUrl, item.posterUrl));
}

function hasCandidateArtwork(candidate: HomeCandidate | null | undefined) {
  if (!candidate) return false;
  return Boolean(getUsableImageUrl(candidate.backdropUrl, candidate.posterUrl));
}

function hydrateEpisodeRowArtwork(
  row: EpisodeScheduleRow,
  followed: FollowedShow[],
  trendingPool: TrendingItem[]
): EpisodeScheduleRow {
  const titleKey = normalizeTitleKey(row.showTitle);

  const followedMatch = followed.find((item) => {
    const sameId = item.id === row.showId;
    const sameTmdb =
      typeof item.tmdbId === "number" &&
      typeof row.tmdbId === "number" &&
      item.tmdbId === row.tmdbId;
    return sameId || sameTmdb || normalizeTitleKey(item.title) === titleKey;
  });

  const trendingMatch = trendingPool.find(
    (item) => normalizeTitleKey(item.title) === titleKey
  );

  return {
    ...row,
    tmdbId: row.tmdbId ?? followedMatch?.tmdbId ?? null,
    provider: row.provider ?? followedMatch?.provider ?? null,
    posterUrl:
      row.posterUrl ??
      followedMatch?.posterUrl ??
      trendingMatch?.posterUrl ??
      undefined,
    backdropUrl:
      row.backdropUrl ??
      followedMatch?.backdropUrl ??
      trendingMatch?.backdropUrl ??
      undefined,
  };
}

function candidateToCardModel(
  candidate: HomeCandidate,
  followed: FollowedShow[],
  trendingPool: TrendingItem[]
): CandidateCardModel | null {
  const resolvedCandidate = resolveCandidateArtwork(candidate, followed, trendingPool);
  const rawShow = candidateToFollowedShow(resolvedCandidate);
  const show = resolveShowArtwork(rawShow, followed) ?? rawShow;

  if (!show?.id || !show.title) return null;

  return {
    id: show.id,
    title: show.title,
    posterUrl: show.posterUrl ?? resolvedCandidate.posterUrl ?? undefined,
    backdropUrl: show.backdropUrl ?? resolvedCandidate.backdropUrl ?? undefined,
    provider:
      show.provider ??
      resolvedCandidate.provider ??
      resolvedCandidate.providerSlug ??
      "Tracked",
    date: getCandidateDate(resolvedCandidate),
    candidate: resolvedCandidate,
  };
}

function toCards(
  items: HomeCandidate[],
  limit: number,
  followed: FollowedShow[],
  trendingPool: TrendingItem[]
): CandidateCardModel[] {
  return uniqueCards(
    items
      .map((item) => candidateToCardModel(item, followed, trendingPool))
      .filter(Boolean) as CandidateCardModel[]
  ).slice(0, limit);
}

export default function HomeClient() {
  const router = useRouter();
  const { userId } = useAuth();
  const { country } = useCountry();

  useEffect(() => {
    ensureKeyframes();
  }, []);

  const isLoggedIn = Boolean(userId);

  const LS_PROVIDERS = `${LS_PROVIDERS_BASE}.${country}`;
  const LS_FOLLOWED = `${LS_FOLLOWED_BASE}.${country}`;

  const [providersOpen, setProvidersOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const [selectedProviders, setSelectedProviders] = useState<SelectableProviderKey[]>([
    "Netflix",
    "Hulu",
    "Max",
  ]);
  const [followed, setFollowed] = useState<FollowedShow[]>([]);
  const [trending, setTrending] = useState<TrendingItem[]>([]);
  const [recommended, setRecommended] = useState<RecommendedItem[]>([]);
  const [episodeRows, setEpisodeRows] = useState<EpisodeScheduleRow[]>([]);

  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<TmdbSearchTvResult[]>([]);
  const [searchErr, setSearchErr] = useState<string | null>(null);

  useEffect(() => {
    try {
      const p = localStorage.getItem(LS_PROVIDERS);
      setSelectedProviders(
        p ? sanitizeStoredProviders(JSON.parse(p)) : ["Netflix", "Hulu", "Max"]
      );

      const f = localStorage.getItem(LS_FOLLOWED);
      if (f) {
        const cleaned = sanitizeStoredFollowed(JSON.parse(f));
        setFollowed(cleaned);
        localStorage.setItem(LS_FOLLOWED, JSON.stringify(cleaned));
      } else {
        setFollowed([]);
      }
    } catch {
      setSelectedProviders(["Netflix", "Hulu", "Max"]);
      setFollowed([]);
    }
  }, [LS_FOLLOWED, LS_PROVIDERS]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_PROVIDERS, JSON.stringify(selectedProviders));
    } catch {}
  }, [selectedProviders, LS_PROVIDERS]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_FOLLOWED, JSON.stringify(followed));
    } catch {}
  }, [followed, LS_FOLLOWED]);

  useEffect(() => {
    let cancelled = false;

    async function loadEpisodeRows() {
      if (!userId) {
        if (!cancelled) setEpisodeRows([]);
        return;
      }

      try {
        const supabase = createClient();

        const { data, error } = await supabase
          .from("user_upcoming_episodes")
          .select(`
            user_id, episode_id, show_id, show_title,
            poster_path, poster_url, tmdb_id, episode_title,
            season, episode, air_date_utc, service_name, service_slug
          `)
          .eq("user_id", userId)
          .gte("air_date_utc", new Date().toISOString())
          .order("air_date_utc", { ascending: true })
          .limit(50);

        if (error) {
          if (!cancelled) setEpisodeRows([]);
          return;
        }

        const mapped: EpisodeScheduleRow[] = ((data ?? []) as UserUpcomingEpisodeRow[])
          .filter(
            (row) =>
              Boolean(row.episode_id) &&
              Boolean(row.show_id) &&
              Boolean(row.show_title) &&
              isValidIsoDate(row.air_date_utc)
          )
          .map((row) => ({
            id: row.episode_id as string,
            showId: row.show_id as string,
            episodeId: row.episode_id,
            tmdbId: row.tmdb_id ?? null,
            showTitle: row.show_title as string,
            episodeTitle: row.episode_title ?? null,
            seasonNumber: row.season ?? null,
            episodeNumber: row.episode ?? null,
            provider: row.service_name ?? null,
            providerSlug: row.service_slug ?? null,
            airDateISO: row.air_date_utc as string,
            posterUrl:
              row.poster_url ?? tmdbPosterUrl(row.poster_path, "w342") ?? undefined,
            backdropUrl: undefined,
            relationship: "followed" as const,
            reason: "because_you_follow" as const,
            source: "user_upcoming_episodes",
          }));

        if (!cancelled) setEpisodeRows(mapped);
      } catch {
        if (!cancelled) setEpisodeRows([]);
      }
    }

    void loadEpisodeRows();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    let cancelled = false;

    async function loadTrending() {
      try {
        const items = await tmdbGetTrendingTv(12, "day");
        if (!cancelled) {
          setTrending(
            items.map((item) => ({
              id: String(item.id),
              title: item.title,
              posterUrl: item.posterUrl,
              backdropUrl: item.backdropUrl,
              provider: "Trending",
            }))
          );
        }
      } catch {
        if (!cancelled) setTrending([]);
      }
    }

    void loadTrending();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setRecommended([]);
  }, [followed, isLoggedIn, selectedProviders]);

  const continueWatching = useMemo(
    () =>
      [...followed]
        .sort((a, b) => {
          const at =
            a.scheduleSource === "verified" && a.nextAirsAtISO
              ? new Date(a.nextAirsAtISO).getTime()
              : Number.MAX_SAFE_INTEGER;
          const bt =
            b.scheduleSource === "verified" && b.nextAirsAtISO
              ? new Date(b.nextAirsAtISO).getTime()
              : Number.MAX_SAFE_INTEGER;
          return at - bt;
        })
        .slice(0, 5),
    [followed]
  );

  const artworkTrendingPool = useMemo(() => {
    if (!isLoggedIn) return trending;
    const followedIds = new Set(followed.map((x) => x.id));
    return trending.filter((item) => !followedIds.has(item.id)).slice(0, 12);
  }, [followed, isLoggedIn, trending]);

  const hydratedEpisodeRows = useMemo(
    () =>
      episodeRows
        .map((row) => hydrateEpisodeRowArtwork(row, followed, artworkTrendingPool))
        .filter((row) => isValidIsoDate(row.airDateISO))
        .sort(
          (a, b) =>
            new Date(a.airDateISO).getTime() - new Date(b.airDateISO).getTime()
        ),
    [artworkTrendingPool, episodeRows, followed]
  );

  const homeCandidates = useMemo(() => {
    const nowMs = Date.now();

    const episodeCandidates = hydratedEpisodeRows.map((row) =>
      normalizeEpisodeCandidate({
        id: row.id,
        showId: row.showId,
        episodeId: row.episodeId ?? null,
        tmdbId: row.tmdbId ?? null,
        showTitle: row.showTitle,
        episodeTitle: row.episodeTitle ?? null,
        seasonNumber: row.seasonNumber ?? null,
        episodeNumber: row.episodeNumber ?? null,
        provider: row.provider ?? null,
        providerSlug: row.providerSlug ?? null,
        airDateISO: row.airDateISO,
        isScheduleVerified: true,
        nowMs,
        posterUrl: row.posterUrl,
        backdropUrl: row.backdropUrl,
        relationship: row.relationship ?? "followed",
        reason: row.reason ?? "because_you_follow",
        source: row.source ?? "episode_schedule",
      })
    );

    const followedCandidates = followed.map((s) =>
      normalizeFollowedShow({
        id: s.id,
        tmdbId: s.tmdbId ?? (Number.isFinite(Number(s.id)) ? Number(s.id) : null),
        title: s.title,
        provider: s.provider,
        posterUrl: s.posterUrl,
        backdropUrl: s.backdropUrl,
        nextAirsAtISO: s.nextAirsAtISO ?? null,
        type: s.scheduleSource === "verified" ? "episode" : "show",
        isScheduleVerified: s.scheduleSource === "verified",
        nowMs,
      })
    );

    const recommendedCandidates = recommended.slice(0, 12).map((item) =>
      normalizeRecommendedItem({
        id: item.id,
        tmdbId: Number.isFinite(Number(item.id)) ? Number(item.id) : null,
        title: item.title,
        posterUrl: item.posterUrl,
        backdropUrl: item.backdropUrl,
        provider: item.provider ?? null,
        seedShowId: item.seedShowId ?? null,
        seedShowTitle: item.seedShowTitle ?? null,
        nextAirsAtISO: item.nextAirsAtISO ?? null,
        type: item.type ?? "show",
        isScheduleVerified: item.isScheduleVerified === true,
        nowMs,
      })
    );

    const trendingCandidates = artworkTrendingPool.slice(0, 12).map((item) =>
      normalizeTrendingItem({
        id: item.id,
        tmdbId: Number.isFinite(Number(item.id)) ? Number(item.id) : null,
        title: item.title,
        posterUrl: item.posterUrl,
        backdropUrl: item.backdropUrl,
        provider: item.provider ?? null,
        type: "show",
        isScheduleVerified: false,
        nowMs,
      })
    );

    return [
      ...episodeCandidates,
      ...followedCandidates,
      ...recommendedCandidates,
      ...trendingCandidates,
    ].map((candidate) =>
      resolveCandidateArtwork(candidate, followed, artworkTrendingPool)
    );
  }, [artworkTrendingPool, followed, hydratedEpisodeRows, recommended]);

  const homeExperience = useMemo<SafeHomeExperience>(() => {
    const result = buildHomeExperience(homeCandidates);
    const resolve = (c: HomeCandidate) =>
      resolveCandidateArtwork(c, followed, artworkTrendingPool);

    return {
      hero: result?.hero ? resolve(result.hero) : null,
      dropsTonight: (result?.dropsTonight ?? []).map(resolve),
      thisWeek: (result?.thisWeek ?? []).map(resolve),
      comingSoon: (result?.comingSoon ?? []).map(resolve),
      startingSoon: (result?.startingSoon ?? []).map(resolve),
      becauseYouFollow: (result?.becauseYouFollow ?? []).map(resolve),
    };
  }, [artworkTrendingPool, followed, homeCandidates]);

  const hero = useMemo(() => {
    const orderedCandidates = [
      ...(homeExperience.hero ? [homeExperience.hero] : []),
      ...homeExperience.dropsTonight,
      ...homeExperience.startingSoon,
      ...homeExperience.thisWeek,
      ...homeExperience.becauseYouFollow,
      ...homeExperience.comingSoon,
      ...homeCandidates,
    ];

    const unique: HomeCandidate[] = [];
    const seen = new Set<string>();

    for (const item of orderedCandidates) {
      const key = `${item.id}::${item.releaseAt ?? "none"}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }

    const preferredHero =
      unique.find((item) => hasCandidateArtwork(item)) ?? unique[0] ?? null;

    return buildHeroViewModel(preferredHero, unique[0] ?? null, followed);
  }, [
    followed,
    homeCandidates,
    homeExperience.becauseYouFollow,
    homeExperience.comingSoon,
    homeExperience.dropsTonight,
    homeExperience.hero,
    homeExperience.startingSoon,
    homeExperience.thisWeek,
  ]);

  const heroIdentityKey = useMemo(
    () =>
      hero.show
        ? `${hero.show.id}::${hero.date?.toISOString() ?? "none"}`
        : null,
    [hero.date, hero.show]
  );

  const dropsTonightCards = useMemo(
    () => toCards(homeExperience.dropsTonight, 12, followed, artworkTrendingPool),
    [artworkTrendingPool, followed, homeExperience.dropsTonight]
  );

  const thisWeekCards = useMemo(
    () => toCards(homeExperience.thisWeek, 20, followed, artworkTrendingPool),
    [artworkTrendingPool, followed, homeExperience.thisWeek]
  );

  const comingSoonCards = useMemo(
    () => toCards(homeExperience.comingSoon, 12, followed, artworkTrendingPool),
    [artworkTrendingPool, followed, homeExperience.comingSoon]
  );

  const allPriorityCards = useMemo(
    () => uniqueCards([...dropsTonightCards, ...thisWeekCards, ...comingSoonCards]),
    [comingSoonCards, dropsTonightCards, thisWeekCards]
  );

  const nextEvent = useMemo(
    () =>
      firstFutureCard(
        allPriorityCards.filter(
          (item) =>
            heroIdentityKey === null ||
            `${item.id}::${item.date?.toISOString() ?? "none"}` !== heroIdentityKey
        )
      ),
    [allPriorityCards, heroIdentityKey]
  );

  const heroQueuePreview = useMemo(
    () =>
      allPriorityCards
        .filter((item) => item.candidate.relationship === "followed")
        .filter(
          (item) =>
            heroIdentityKey === null ||
            `${item.id}::${item.date?.toISOString() ?? "none"}` !== heroIdentityKey
        )
        .slice(0, 2),
    [allPriorityCards, heroIdentityKey]
  );

  const trendingRailItems = useMemo(
    () => artworkTrendingPool.filter(hasUsableTrendingImage),
    [artworkTrendingPool]
  );

  const activeHeroBackdropUrl = hero.backgroundUrl ?? hero.show?.backdropUrl ?? undefined;
  const heroBackgroundImage =
    activeHeroBackdropUrl ?? hero.posterUrl ?? hero.show?.posterUrl ?? undefined;

  const releaseStripTonight = dropsTonightCards[0] ?? null;

  const releaseStripStartingSoon =
    firstFutureCard(
      uniqueCards(
        homeExperience.startingSoon
          .map((item) => candidateToCardModel(item, followed, artworkTrendingPool))
          .filter(Boolean) as CandidateCardModel[]
      )
    ) ?? null;

  const releaseStripWeek = firstFutureCard(thisWeekCards);

  function toggleProvider(p: SelectableProviderKey) {
    setSelectedProviders((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  }

  function removeFollowed(id: string) {
    setFollowed((prev) => prev.filter((s) => s.id !== id));
  }

  async function runSearch(next: string) {
    setQ(next);
    const s = next.trim();

    if (s.length < 2) {
      setResults([]);
      setSearchErr(null);
      return;
    }

    setSearching(true);
    setSearchErr(null);

    try {
      const r = await tmdbSearchTv(s);
      setResults(r.slice(0, 12));
    } catch (e: unknown) {
      setSearchErr(e instanceof Error ? e.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  function followTmdbShow(x: TmdbSearchTvResult, provider: SelectableProviderKey) {
    if (!userId) {
      router.push("/login");
      return;
    }

    if (followed.length >= FOLLOWED_LIMIT) {
      toast.warning(
        "Free mode includes up to 3 followed shows. Upgrade later for unlimited tracking and reminders."
      );
      return;
    }

    const newItem: FollowedShow = {
      id: String(x.id),
      tmdbId: x.id,
      title: x.name,
      provider,
      posterUrl: tmdbPosterUrl(x.poster_path, "w342") ?? undefined,
      backdropUrl: tmdbBackdropUrl(x.backdrop_path, "w1280") ?? undefined,
    };

    setFollowed((prev) =>
      prev.some((p) => p.id === newItem.id) ? prev : [...prev, newItem]
    );

    setSearchOpen(false);
    setQ("");
    setResults([]);
    setSearchErr(null);
    setSearching(false);
    toast.success(`Added ${x.name} to your followed shows.`);
  }

  function openFollowModal() {
    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    setSearchOpen(true);
    setSearchErr(null);
    setResults([]);
    setSearching(false);
    setQ("");
  }

  function openPlatformsFromSearch() {
    setSearchOpen(false);
    setProvidersOpen(true);
  }

  return (
    <PageShell>
      <div
        className="relative min-h-screen overflow-hidden text-zinc-50"
        style={{ background: "#080808" }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_-10%,rgba(255,255,255,0.035),transparent)]" />

        <section className="relative isolate flex min-h-[600px] flex-col md:min-h-[680px] xl:min-h-[740px]">
          {heroBackgroundImage ? (
            <div className="pointer-events-none absolute inset-0 z-0">
              <Image
                src={heroBackgroundImage}
                alt=""
                fill
                priority
                sizes="100vw"
                quality={92}
                unoptimized
                placeholder="blur"
                blurDataURL={shimmerBlurDataURL(1600, 900)}
                className="object-cover object-[58%_42%] scale-[1.06] transition-transform duration-[8000ms] ease-out"
              />
            </div>
          ) : null}

          <div
            className="pointer-events-none absolute inset-0 z-10"
            style={{
              background:
                "linear-gradient(to right, rgba(0,0,0,0.60) 0%, rgba(0,0,0,0.38) 30%, rgba(0,0,0,0.12) 55%, rgba(0,0,0,0) 75%)",
            }}
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-10"
            style={{
              height: "360px",
              background:
                "linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.64) 26%, rgba(0,0,0,0.22) 56%, transparent 100%)",
            }}
          />
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-10"
            style={{
              height: "130px",
              background: "linear-gradient(to bottom, rgba(0,0,0,0.42) 0%, transparent 100%)",
            }}
          />

          <PageWrap
            className="relative z-30 flex-1"
            style={{
              paddingTop: "clamp(108px, 13vh, 156px)",
              paddingBottom: "clamp(36px, 5vh, 64px)",
            }}
          >
            <div className="mx-auto max-w-[1180px]">
              <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_272px] xl:items-end">
                <div
                  className="md:max-w-[700px]"
                  style={{
                    animation: "ww-fade-up 0.7s cubic-bezier(0.22,1,0.36,1) 80ms both",
                  }}
                >
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span
                      className="inline-flex items-center gap-2.5 rounded-full px-5 py-2.5"
                      style={{
                        background: "rgba(52,211,153,0.16)",
                        border: "1px solid rgba(52,211,153,0.52)",
                        boxShadow:
                          "0 0 36px rgba(52,211,153,0.20), inset 0 1px 0 rgba(52,211,153,0.18)",
                        backdropFilter: "blur(14px)",
                      }}
                    >
                      <span className="relative flex h-2.5 w-2.5 shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span
                          className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400"
                          style={{ boxShadow: "0 0 10px rgba(52,211,153,1)" }}
                        />
                      </span>
                      <span
                        className="text-[13px] font-black uppercase tracking-[0.18em]"
                        style={{ color: "#6ee7b7" }}
                      >
                        {hero.badgeLabel}
                      </span>
                    </span>

                    <span
                      className="inline-flex items-center rounded-full px-4 py-2"
                      style={{
                        background: "#1a1a1a",
                        border: "1px solid rgba(255,255,255,0.58)",
                      }}
                    >
                      <span className="text-[13px] font-black uppercase tracking-[0.16em] text-white">
                        {heroSupportLabel(hero.mode)}
                      </span>
                    </span>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <ProviderPill name={hero.show?.provider ?? "Tracked"} />
                    {hero.date ? (
                      <>
                        <span style={{ color: "rgba(255,255,255,0.36)" }}>·</span>
                        <span
                          className="text-[17px] font-black"
                          style={{
                            color: "#ffffff",
                            textShadow: "0 1px 4px rgba(0,0,0,0.9), 0 2px 16px rgba(0,0,0,0.7)",
                          }}
                        >
                          {formatDowMonthDay(hero.date)}
                        </span>
                        <span style={{ color: "rgba(255,255,255,0.46)" }}>·</span>
                        <span
                          className="text-[17px] font-bold"
                          style={{
                            color: "#ffffff",
                            textShadow: "0 1px 4px rgba(0,0,0,0.9), 0 2px 16px rgba(0,0,0,0.7)",
                          }}
                        >
                          {formatTime(hero.date)}
                        </span>
                        <span
                          className="rounded-full px-4 py-1.5 text-[13px] font-black"
                          style={{
                            background: "rgba(52,211,153,0.20)",
                            border: "1px solid rgba(52,211,153,0.52)",
                            color: "#6ee7b7",
                            boxShadow:
                              "0 0 24px rgba(52,211,153,0.26), inset 0 1px 0 rgba(52,211,153,0.28)",
                          }}
                        >
                          <HeroCountdown target={hero.date} />
                        </span>
                      </>
                    ) : (
                      <span
                        className="text-[16px] font-semibold"
                        style={{ color: "rgba(255,255,255,0.76)" }}
                      >
                        Release time TBD
                      </span>
                    )}
                  </div>

                  <h1
                    className="mt-5 font-black text-white"
                    style={{
                      fontSize: "clamp(2.6rem, 6vw, 6.5rem)",
                      lineHeight: "0.86",
                      letterSpacing: "-0.055em",
                      textShadow:
                        "0 2px 4px rgba(0,0,0,0.9), 0 4px 24px rgba(0,0,0,0.8), 0 8px 48px rgba(0,0,0,0.6)",
                    }}
                  >
                    {hero.title}
                  </h1>

                  <p
                    className="mt-5 max-w-[44ch] leading-[1.72]"
                    style={{
                      fontSize: "clamp(15px, 1.6vw, 18px)",
                      color: "rgba(255,255,255,0.95)",
                      textShadow: "0 1px 4px rgba(0,0,0,0.9), 0 2px 16px rgba(0,0,0,0.7)",
                    }}
                  >
                    {hero.description}
                  </p>

                  <div className="mt-9 mb-7 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => router.push(hero.primaryHref)}
                      className="h-[60px] rounded-[18px] px-10 text-[17px] font-black text-black transition-all duration-200 hover:scale-[1.04] active:scale-[0.97]"
                      style={{
                        background: "#ffffff",
                        boxShadow:
                          "0 0 0 3px rgba(255,255,255,0.48), 0 8px 40px rgba(0,0,0,0.9), 0 16px 56px -16px rgba(255,255,255,0.22)",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {hero.primaryLabel}
                    </button>

                    <button
                      onClick={() => router.push(hero.secondaryHref)}
                      className="h-[60px] rounded-[18px] px-9 text-[17px] font-bold text-white transition-all duration-200 hover:scale-[1.04] active:scale-[0.97]"
                      style={{
                        background: "#1a1a1a",
                        border: "2px solid rgba(255,255,255,0.88)",
                        boxShadow: "0 8px 40px rgba(0,0,0,0.9)",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {hero.secondaryLabel}
                    </button>

                    {isLoggedIn ? (
                      <button
                        onClick={openFollowModal}
                        className="h-[52px] rounded-[16px] px-5 text-[15px] font-semibold text-white transition-all hover:scale-[1.02]"
                        style={{
                          background: "rgba(0,0,0,0.72)",
                          border: "1px solid rgba(255,255,255,0.42)",
                          backdropFilter: "blur(12px)",
                        }}
                      >
                        + Follow a show
                      </button>
                    ) : (
                      <button
                        onClick={() => router.push("/login")}
                        className="h-[52px] rounded-[16px] px-5 text-[15px] font-semibold text-white transition-all hover:scale-[1.02]"
                        style={{
                          background: "rgba(0,0,0,0.72)",
                          border: "1px solid rgba(255,255,255,0.42)",
                          backdropFilter: "blur(12px)",
                        }}
                      >
                        Create account
                      </button>
                    )}

                    <button
                      onClick={() => setProvidersOpen(true)}
                      className="h-[52px] rounded-[16px] px-5 text-[15px] font-medium text-white transition-all hover:scale-[1.02]"
                      style={{
                        background: "rgba(0,0,0,0.60)",
                        border: "1px solid rgba(255,255,255,0.30)",
                        backdropFilter: "blur(10px)",
                      }}
                    >
                      Platforms
                    </button>
                  </div>
                </div>

                <div
                  className="hidden xl:block xl:justify-self-end xl:w-[272px] xl:min-w-0 xl:overflow-hidden"
                  style={{
                    animation:
                      "ww-fade-up 0.7s cubic-bezier(0.22,1,0.36,1) 220ms both, ww-float 6s ease-in-out 1s infinite",
                  }}
                >
                  <HeroStagePanel
                    title={hero.title}
                    posterUrl={hero.posterUrl ?? hero.show?.posterUrl ?? null}
                    backdropUrl={
                      activeHeroBackdropUrl ??
                      hero.posterUrl ??
                      hero.show?.posterUrl ??
                      null
                    }
                    provider={hero.show?.provider ?? "Tracked"}
                    when={
                      hero.date
                        ? `${formatDowMonthDay(hero.date)} • ${formatTime(hero.date)}`
                        : "Release time TBD"
                    }
                    urgency={hero.date ? hoursFromNowLabel(hero.date) : "Queued"}
                    supportLabel={heroSupportLabel(hero.mode)}
                    onPrimary={() => router.push(hero.primaryHref)}
                    onSecondary={() => router.push("/calendar")}
                  />
                </div>
              </div>
            </div>
          </PageWrap>

          <PageWrap
            className="relative z-30 mt-auto"
            style={{ paddingTop: "36px", paddingBottom: "28px" }}
          >
            <div className="mx-auto max-w-[1180px]">
              <div
                className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
                style={{
                  animation: "ww-fade-up 0.65s cubic-bezier(0.22,1,0.36,1) 340ms both",
                }}
              >
                <ReleaseStripCard
                  label="Tonight"
                  count={dropsTonightCards.length}
                  title={releaseStripTonight?.title ?? "Your night is clear"}
                  detail={
                    releaseStripTonight?.date
                      ? `${formatDowMonthDay(releaseStripTonight.date)} • ${formatTime(releaseStripTonight.date)}`
                      : "Follow shows and your next drop will appear here the moment it's scheduled."
                  }
                  chip={
                    releaseStripTonight?.date
                      ? hoursFromNowLabel(releaseStripTonight.date)
                      : undefined
                  }
                  provider={releaseStripTonight?.provider}
                  onClick={
                    releaseStripTonight
                      ? () => router.push(`/tv/${releaseStripTonight.id}`)
                      : () => router.push("/calendar")
                  }
                  actionLabel={releaseStripTonight ? "Open" : "Calendar"}
                />

                <ReleaseStripCard
                  label="Starting Soon"
                  count={homeExperience.startingSoon.length}
                  title={releaseStripStartingSoon?.title ?? "Nothing on deck yet"}
                  detail={
                    releaseStripStartingSoon?.date
                      ? `${formatDowMonthDay(releaseStripStartingSoon.date)} • ${formatTime(releaseStripStartingSoon.date)}`
                      : "Verified releases approaching fast. Follow a show to see them here first."
                  }
                  chip={
                    releaseStripStartingSoon?.date
                      ? hoursFromNowLabel(releaseStripStartingSoon.date)
                      : undefined
                  }
                  provider={releaseStripStartingSoon?.provider}
                  onClick={
                    releaseStripStartingSoon
                      ? () => router.push(`/tv/${releaseStripStartingSoon.id}`)
                      : () => router.push("/calendar")
                  }
                  actionLabel={releaseStripStartingSoon ? "Open" : "Calendar"}
                />

                <ReleaseStripCard
                  label="This Week"
                  count={thisWeekCards.length}
                  title={releaseStripWeek?.title ?? "Your week, curated"}
                  detail={
                    releaseStripWeek?.date
                      ? `${formatDowMonthDay(releaseStripWeek.date)} • ${formatTime(releaseStripWeek.date)}`
                      : "The best week-level view — no filler, no noise, just what matters."
                  }
                  chip={
                    releaseStripWeek?.date
                      ? hoursFromNowLabel(releaseStripWeek.date)
                      : undefined
                  }
                  provider={releaseStripWeek?.provider}
                  onClick={() => router.push("/calendar")}
                  actionLabel="View week"
                />

                <QuickToolsCard
                  title={
                    nextEvent?.title ??
                    (isLoggedIn ? "Build your command center" : "Your personal homepage awaits")
                  }
                  detail={
                    nextEvent?.date
                      ? `${formatDowMonthDay(nextEvent.date)} • ${formatTime(nextEvent.date)}`
                      : isLoggedIn
                        ? "Follow shows and this card becomes your real-time release dashboard."
                        : "Sign up and WatchWeek becomes a homepage that knows what matters tonight."
                  }
                  chip={nextEvent?.date ? hoursFromNowLabel(nextEvent.date) : undefined}
                  primaryLabel={
                    nextEvent ? "Open next" : isLoggedIn ? "Follow a show" : "Create account"
                  }
                  secondaryLabel={isLoggedIn ? "Calendar" : "Preview"}
                  onPrimary={
                    nextEvent
                      ? () => router.push(`/tv/${nextEvent.id}`)
                      : isLoggedIn
                        ? openFollowModal
                        : () => router.push("/login")
                  }
                  onSecondary={() => router.push("/calendar")}
                />
              </div>
            </div>
          </PageWrap>
        </section>

        <main className="relative z-20 pb-16 md:pb-20">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 15%, rgba(255,255,255,0.20) 50%, rgba(255,255,255,0.12) 85%, transparent 100%)",
            }}
          />

          <PageWrap className="pt-10 md:pt-12">
            <div className="mx-auto max-w-[1180px] space-y-7 md:space-y-9">
              {isLoggedIn && heroQueuePreview.length > 0 ? (
                <div
                  className="pt-3 md:pt-4"
                  style={{ animation: "ww-fade-up 0.6s cubic-bezier(0.22,1,0.36,1) 0ms both" }}
                >
                  <QueuePeekStrip
                    items={heroQueuePreview}
                    onOpen={(id) => router.push(`/tv/${id}`)}
                    onOpenCalendar={() => router.push("/calendar")}
                  />
                </div>
              ) : null}

              {dropsTonightCards.length === 1 ? (
                <section className="relative">
                  <SectionHeader title="Drops Tonight" eyebrow="Priority release" />
                  <div className="mt-3">
                    <FeaturedDropTonightCompact
                      item={dropsTonightCards[0]}
                      onPrimary={() => router.push(`/tv/${dropsTonightCards[0].id}`)}
                      onSecondary={() => router.push("/calendar")}
                      onRemove={
                        dropsTonightCards[0].candidate.relationship === "followed"
                          ? () => removeFollowed(dropsTonightCards[0].id)
                          : undefined
                      }
                    />
                  </div>
                </section>
              ) : null}

              {dropsTonightCards.length > 1 ? (
                <section className="relative">
                  <Rail
                    title="Drops Tonight"
                    subtitle="Immediate release priorities"
                    actionLabel="Calendar"
                    actionHref="/calendar"
                    contentClassName={dropsTonightCards.length <= 2 ? "px-1" : "px-1 pb-2"}
                    fadeEdges={dropsTonightCards.length > 2}
                    compactWhenFew
                    itemCount={dropsTonightCards.length}
                  >
                    {dropsTonightCards.map((item) => (
                      <HomePosterTile
                        key={`tonight-${item.id}-${item.date?.toISOString() ?? "none"}`}
                        title={item.title}
                        img={item.posterUrl}
                        provider={item.provider}
                        meta={
                          item.date
                            ? `${formatDowMonthDay(item.date)} • ${formatTime(item.date)}`
                            : "Release time TBD"
                        }
                        rightMeta={item.date ? hoursFromNowLabel(item.date) : undefined}
                        onPrimary={() => router.push(`/tv/${item.id}`)}
                        primaryLabel="View"
                        onSecondary={
                          item.candidate.relationship === "followed"
                            ? () => removeFollowed(item.id)
                            : undefined
                        }
                        secondaryLabel={
                          item.candidate.relationship === "followed" ? "Remove" : undefined
                        }
                      />
                    ))}
                  </Rail>
                </section>
              ) : null}

              {homeExperience.startingSoon.length > 0 ? (
                <section className="relative">
                  <StartingSoonRail items={homeExperience.startingSoon} />
                </section>
              ) : null}

              {thisWeekCards.length > 0 ? (
                <section className="relative">
                  <SectionHeader title="This Week" eyebrow="Curated week view" />
                  <div className="mt-3">
                    <WeekEditorialList
                      items={thisWeekCards.slice(0, 4)}
                      onOpen={(id) => router.push(`/tv/${id}`)}
                      onCalendar={() => router.push("/calendar")}
                      onRemove={(id) => removeFollowed(id)}
                    />
                  </div>
                </section>
              ) : null}

              {isLoggedIn && homeExperience.becauseYouFollow.length > 0 ? (
                <section className="relative">
                  <BecauseYouFollowRail items={homeExperience.becauseYouFollow} />
                </section>
              ) : null}

              {isLoggedIn && continueWatching.length > 0 ? (
                <section className="relative">
                  <Rail
                    title="My Queue"
                    subtitle="Quick access to your followed shows"
                    actionLabel={continueWatching.length > 3 ? "Library" : undefined}
                    actionHref={continueWatching.length > 3 ? "/library" : undefined}
                    contentClassName={continueWatching.length <= 2 ? "" : "pb-1"}
                    fadeEdges={continueWatching.length > 2}
                    compactWhenFew
                    itemCount={continueWatching.length}
                  >
                    {continueWatching.map((s) => {
                      const d =
                        s.scheduleSource === "verified" && s.nextAirsAtISO
                          ? new Date(s.nextAirsAtISO)
                          : null;

                      return (
                        <ContinueWatchingTile
                          key={`continue-${s.id}`}
                          title={s.title}
                          img={s.posterUrl}
                          provider={s.provider}
                          meta="Saved to your queue"
                          schedule={
                            d
                              ? `${formatDowMonthDay(d)} • ${formatTime(d)}`
                              : "Next up TBD"
                          }
                          urgency={d ? hoursFromNowLabel(d) : undefined}
                          onPrimary={() => router.push(`/tv/${s.id}`)}
                          onSecondary={() => removeFollowed(s.id)}
                        />
                      );
                    })}
                  </Rail>
                </section>
              ) : null}

              {!isLoggedIn ? <SignedOutPromoRail /> : null}

              {trendingRailItems.length > 0 ? (
                <section className="relative">
                  <TrendingPosterShelf
                    items={trendingRailItems}
                    onOpen={(id) => router.push(`/tv/${id}`)}
                    onViewAll={() => router.push("/tv")}
                  />
                </section>
              ) : null}

              {comingSoonCards.length > 0 ? (
                <section className="relative">
                  <Rail
                    title="Coming Soon"
                    subtitle="Verified releases beyond this week"
                    contentClassName={comingSoonCards.length <= 2 ? "px-1" : "px-1 pb-2"}
                    fadeEdges={comingSoonCards.length > 2}
                    compactWhenFew
                    itemCount={comingSoonCards.length}
                  >
                    {comingSoonCards.map((item) => (
                      <HomePosterTile
                        key={`coming-${item.id}-${item.date?.toISOString() ?? "none"}`}
                        title={item.title}
                        img={item.posterUrl}
                        provider={item.provider}
                        meta={
                          item.date
                            ? `${formatDowMonthDay(item.date)} • ${formatTime(item.date)}`
                            : "Release time TBD"
                        }
                        rightMeta={item.date ? hoursFromNowLabel(item.date) : undefined}
                        onPrimary={() => router.push(`/tv/${item.id}`)}
                        primaryLabel="View"
                      />
                    ))}
                  </Rail>
                </section>
              ) : null}

              <section className="relative">
                <SectionHeader
                  title="Calendar, reminders & account"
                  eyebrow="More tools"
                />

                <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_260px]">
                  <section
                    className="relative overflow-hidden rounded-[22px] p-5"
                    style={{
                      background: "linear-gradient(145deg, #1c1c1c 0%, #141414 100%)",
                      border: "1px solid rgba(255,255,255,0.38)",
                      boxShadow:
                        "0 0 0 1px rgba(255,255,255,0.05) inset, 0 26px 68px -36px rgba(0,0,0,1)",
                    }}
                  >
                    <div
                      className="pointer-events-none absolute inset-x-0 top-0 h-[2px]"
                      style={{
                        background:
                          "linear-gradient(90deg, transparent, rgba(255,255,255,0.58) 28%, rgba(255,255,255,0.58) 72%, transparent)",
                      }}
                    />
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div
                          className="text-[9px] font-black uppercase tracking-[0.36em]"
                          style={{ color: "rgba(255,255,255,0.30)" }}
                        >
                          Calendar
                        </div>
                        <h3 className="mt-2 text-[17px] font-black tracking-[-0.04em] text-white">
                          Tonight timeline
                        </h3>
                        <p
                          className="mt-1.5 text-[13px] leading-[1.65]"
                          style={{ color: "rgba(255,255,255,0.50)" }}
                        >
                          {hydratedEpisodeRows.length > 0
                            ? "Your live night view — everything dropping in order."
                            : "Follow shows and your live night view appears here automatically."}
                        </p>
                      </div>
                      <button
                        onClick={() => router.push("/calendar")}
                        className="shrink-0 h-9 rounded-[13px] px-4 text-[12px] font-bold text-black transition-all hover:scale-[1.02]"
                        style={{
                          background: "linear-gradient(180deg, #ffffff 0%, #dedede 100%)",
                          boxShadow: "0 8px 22px -10px rgba(255,255,255,0.52)",
                        }}
                      >
                        Open calendar
                      </button>
                    </div>

                    {hydratedEpisodeRows.length > 0 ? (
                      <div
                        className="mt-4 overflow-hidden rounded-[14px] p-2"
                        style={{
                          background: "rgba(0,0,0,0.26)",
                          border: "1px solid rgba(255,255,255,0.07)",
                        }}
                      >
                        <TodayTimeline
                          items={hydratedEpisodeRows.slice(0, 4).map((row) => ({
                            show_id: row.showId,
                            show_title: row.showTitle,
                            poster_url: row.posterUrl,
                            service_name: row.provider ?? row.providerSlug ?? "Tracked",
                            air_date_utc: row.airDateISO,
                          }))}
                        />
                      </div>
                    ) : (
                      <div
                        className="mt-4 rounded-[14px] border border-dashed px-4 py-6 text-center text-[13px]"
                        style={{
                          borderColor: "rgba(255,255,255,0.08)",
                          color: "rgba(255,255,255,0.30)",
                          background: "rgba(0,0,0,0.16)",
                        }}
                      >
                        No timeline items yet — follow shows to fill this in.
                      </div>
                    )}
                  </section>

                  <div className="grid gap-3">
                    <CompactUtilityCard
                      eyebrow="Reminders"
                      title={
                        isLoggedIn
                          ? "Get the nudge before you miss it"
                          : "Create an account for reminders"
                      }
                      detail={
                        isLoggedIn
                          ? "Notifications and reminder settings live in your account flow."
                          : "Follow shows, build your queue, and unlock reminders."
                      }
                      primaryLabel={isLoggedIn ? "Open portal" : "Create account"}
                      secondaryLabel="Calendar"
                      onPrimary={() => router.push(isLoggedIn ? "/portal" : "/login")}
                      onSecondary={() => router.push("/calendar")}
                    />
                    <CompactUtilityCard
                      eyebrow="Account"
                      title={
                        isLoggedIn
                          ? "Manage platforms, queue, and profile"
                          : "Preview the full release calendar"
                      }
                      detail={
                        isLoggedIn
                          ? "Subscription, reminders, and personalization live here."
                          : "See what drops tonight and this week before creating an account."
                      }
                      primaryLabel={isLoggedIn ? "Open portal" : "Preview calendar"}
                      secondaryLabel={isLoggedIn ? "Library" : "Explore TV"}
                      onPrimary={() => router.push(isLoggedIn ? "/portal" : "/calendar")}
                      onSecondary={() => router.push(isLoggedIn ? "/library" : "/tv")}
                    />
                  </div>
                </div>
              </section>
            </div>
          </PageWrap>
        </main>

        {providersOpen ? (
          <Modal onClose={() => setProvidersOpen(false)}>
            <div
              className="w-full max-w-lg rounded-[28px] p-6"
              style={{
                background: "rgba(14,14,14,0.98)",
                border: "1px solid rgba(255,255,255,0.14)",
                boxShadow: "0 56px 140px -56px rgba(0,0,0,1), 0 0 0 1px rgba(255,255,255,0.05) inset",
                backdropFilter: "blur(28px)",
              }}
            >
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-[28px]"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.28) 30%, rgba(255,255,255,0.28) 70%, transparent)",
                }}
              />

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[18px] font-black tracking-[-0.03em] text-white">
                    Platforms
                  </div>
                  <div
                    className="mt-0.5 text-[13px]"
                    style={{ color: "rgba(255,255,255,0.56)" }}
                  >
                    Choose what you subscribe to.
                  </div>
                </div>
                <button
                  onClick={() => setProvidersOpen(false)}
                  className="h-10 rounded-[14px] px-4 text-[13px] font-semibold transition-all hover:bg-white/[0.09]"
                  style={{
                    color: "rgba(255,255,255,0.84)",
                    border: "1px solid rgba(255,255,255,0.16)",
                    background: "rgba(255,255,255,0.06)",
                  }}
                >
                  Close
                </button>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {ALL_PROVIDERS.map((p) => {
                  const active = selectedProviders.includes(p.key);
                  return (
                    <button
                      key={p.key}
                      onClick={() => toggleProvider(p.key)}
                      className="h-12 rounded-[14px] px-3 text-[13px] font-black transition-all duration-150 hover:scale-[1.02] active:scale-[0.97]"
                      style={{
                        background: active ? "#ffffff" : "rgba(255,255,255,0.05)",
                        color: active ? "#000000" : "rgba(255,255,255,0.88)",
                        border: active
                          ? "none"
                          : "1px solid rgba(255,255,255,0.14)",
                        boxShadow: active
                          ? "0 4px 18px -6px rgba(255,255,255,0.44)"
                          : "none",
                      }}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>

              <p
                className="mt-6 text-[12px] leading-6"
                style={{ color: "rgba(255,255,255,0.44)" }}
              >
                We use these selections to power your Follow buttons and watch links.
              </p>
            </div>
          </Modal>
        ) : null}

        {searchOpen ? (
          <Modal onClose={() => setSearchOpen(false)}>
            <div
              className="w-full max-w-2xl rounded-[28px] p-6"
              style={{
                background: "rgba(14,14,14,0.98)",
                border: "1px solid rgba(255,255,255,0.14)",
                boxShadow: "0 56px 140px -56px rgba(0,0,0,1), 0 0 0 1px rgba(255,255,255,0.05) inset",
                backdropFilter: "blur(28px)",
              }}
            >
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-t-[28px]"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.26) 30%, rgba(255,255,255,0.26) 70%, transparent)",
                }}
              />

              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[18px] font-black tracking-[-0.03em] text-white">
                    Find a show
                  </div>
                  <div
                    className="mt-0.5 text-[13px]"
                    style={{ color: "rgba(255,255,255,0.54)" }}
                  >
                    Search TMDB and follow it. Reminders unlock in the portal.
                  </div>
                </div>
                <button
                  onClick={() => setSearchOpen(false)}
                  className="h-10 shrink-0 rounded-[14px] px-4 text-[13px] font-semibold transition-all hover:bg-white/[0.09]"
                  style={{
                    color: "rgba(255,255,255,0.84)",
                    border: "1px solid rgba(255,255,255,0.16)",
                    background: "rgba(255,255,255,0.06)",
                  }}
                >
                  Close
                </button>
              </div>

              <div className="mt-5 flex gap-2">
                <input
                  value={q}
                  onChange={(e) => runSearch(e.target.value)}
                  placeholder="Search: Scrubs, The Pitt, The Rookie…"
                  className="h-12 w-full rounded-[16px] px-4 text-[14px] text-white outline-none placeholder:text-zinc-500 transition"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.14)",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.border = "1px solid rgba(255,255,255,0.28)";
                    e.currentTarget.style.background = "rgba(255,255,255,0.09)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.border = "1px solid rgba(255,255,255,0.14)";
                    e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                  }}
                />
                <button
                  onClick={() => runSearch(q)}
                  className="h-12 shrink-0 rounded-[16px] px-5 text-[13px] font-black text-black transition-all hover:scale-[1.02] active:scale-[0.97]"
                  style={{
                    background: "linear-gradient(180deg, #ffffff 0%, #dedede 100%)",
                    boxShadow: "0 8px 22px -10px rgba(255,255,255,0.5)",
                  }}
                >
                  Search
                </button>
              </div>

              {searchErr ? (
                <div className="mt-3 text-[13px] text-red-300">{searchErr}</div>
              ) : null}
              {searching ? (
                <div
                  className="mt-3 text-[13px]"
                  style={{ color: "rgba(255,255,255,0.52)" }}
                >
                  Searching…
                </div>
              ) : null}

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {results.map((r) => {
                  const img = tmdbPosterUrl(r.poster_path, "w185");
                  return (
                    <div
                      key={r.id}
                      className="flex gap-3 rounded-[18px] p-3 transition-all hover:bg-white/[0.06]"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.10)",
                      }}
                    >
                      <div
                        className="relative h-20 w-14 shrink-0 overflow-hidden rounded-[12px]"
                        style={{
                          background: "rgba(255,255,255,0.08)",
                          border: "1px solid rgba(255,255,255,0.12)",
                        }}
                      >
                        {img ? (
                          <Image
                            src={img}
                            alt={r.name}
                            fill
                            sizes="56px"
                            quality={70}
                            unoptimized
                            placeholder="blur"
                            blurDataURL={shimmerBlurDataURL(140, 200)}
                            className="object-cover"
                          />
                        ) : null}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14px] font-black text-white">
                          {r.name}
                        </div>
                        {r.first_air_date ? (
                          <div
                            className="mt-0.5 text-[12px]"
                            style={{ color: "rgba(255,255,255,0.52)" }}
                          >
                            First aired: {r.first_air_date}
                          </div>
                        ) : (
                          <div className="mt-0.5 text-[12px]">&nbsp;</div>
                        )}

                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {(selectedProviders.length
                            ? selectedProviders
                            : (["Netflix"] as SelectableProviderKey[])
                          )
                            .slice(0, 4)
                            .map((p) => (
                              <button
                                key={p}
                                onClick={() => followTmdbShow(r, p)}
                                className="h-7 rounded-[10px] px-2.5 text-[11px] font-black text-black transition-all hover:scale-[1.03]"
                                style={{
                                  background: "linear-gradient(180deg, #ffffff 0%, #e4e4e4 100%)",
                                  boxShadow: "0 4px 12px -6px rgba(255,255,255,0.4)",
                                }}
                              >
                                Follow on {p}
                              </button>
                            ))}
                        </div>

                        <div
                          className="mt-2 text-[11px]"
                          style={{ color: "rgba(255,255,255,0.46)" }}
                        >
                          Missing the right platform?{" "}
                          <button
                            type="button"
                            onClick={openPlatformsFromSearch}
                            className="font-semibold underline underline-offset-4 transition hover:text-white"
                            style={{ color: "rgba(255,255,255,0.76)" }}
                          >
                            Open Platforms
                          </button>
                          .
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {!searching && q.trim().length >= 2 && results.length === 0 && !searchErr ? (
                <div
                  className="mt-5 text-[13px]"
                  style={{ color: "rgba(255,255,255,0.52)" }}
                >
                  No results. Try a different search.
                </div>
              ) : null}
            </div>
          </Modal>
        ) : null}
      </div>
    </PageShell>
  );
}