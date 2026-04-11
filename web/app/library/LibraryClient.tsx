"use client";

import { FREE_FOLLOW_LIMIT } from "@/lib/billing";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  tmdbPosterUrl,
  tmdbSearchTv,
  type TmdbSearchTvResult,
} from "@/lib/tmdb";
import { createClient } from "@/lib/supabase-browser";
import { getProviderMeta } from "@/lib/providers";
import { CURATED_SERVICES } from "@/lib/services/catalog";
import {
  canonicalServiceForSlug,
  getShowCanonicalServiceKeys,
  mapCanonicalKeysToOptions,
  mapStreamingServicesToCanonicalOptions,
  type CanonicalServiceOption,
} from "@/lib/services/normalize";

type DbFollowedShow = {
  user_id: string;
  show_id: string;
  created_at: string;
  poster_path: string | null;
  tmdb_id: number;
  title: string;
  poster_url: string | null;
  providers_flatrate?: string[];
  providers_free?: string[];
  providers_ads?: string[];
  providers_primary?: string[];
  primary_provider?: string | null;
};

type StreamingService = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
};

type FollowedSort = "recent" | "title-asc" | "title-desc" | "provider";

function yearFromFirstAirDate(s?: string) {
  const d = (s ?? "").trim();
  if (!d) return "";
  const y = d.slice(0, 4);
  return /^\d{4}$/.test(y) ? y : "";
}

function formatAddedDate(s?: string) {
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getShowProviderSlugs(show: DbFollowedShow) {
  return [
    ...(show.primary_provider ? [show.primary_provider] : []),
    ...(show.providers_primary ?? []),
    ...(show.providers_flatrate ?? []),
    ...(show.providers_free ?? []),
    ...(show.providers_ads ?? []),
  ].filter(Boolean);
}

function firstProviderLabel(show: DbFollowedShow) {
  const providerSlugs = getShowProviderSlugs(show);

  for (const slug of providerSlugs) {
    const canonical = canonicalServiceForSlug(slug);
    if (canonical) return canonical.label;
  }

  const primary = (show.primary_provider ?? "").trim();
  if (primary) return getProviderMeta(primary).label;

  const fallback =
    show.providers_primary?.[0] ??
    show.providers_flatrate?.[0] ??
    show.providers_free?.[0] ??
    show.providers_ads?.[0] ??
    "";

  return fallback ? getProviderMeta(fallback).label : "Unknown";
}

function ProviderBadge({ provider }: { provider: string }) {
  const meta = getProviderMeta(provider);

  if (meta.logoPath) {
    return (
      <div
        className={`inline-flex h-7 items-center rounded-full px-2.5 ${meta.theme.bg} ${meta.theme.ring}`}
        title={meta.label}
      >
        <div className="relative h-3.5 w-[52px]">
          <Image
            src={meta.logoPath}
            alt={meta.label}
            fill
            sizes="52px"
            className="object-contain"
          />
        </div>
      </div>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${meta.theme.bg} ${meta.theme.text} ${meta.theme.ring}`}
      title={meta.label}
    >
      {meta.label}
    </span>
  );
}

function renderProvidersRow(p?: {
  primary_provider?: string | null;
  providers_primary?: string[];
  flatrate?: string[];
  free?: string[];
  ads?: string[];
}) {
  const primary = (p?.primary_provider ?? null) || null;
  const primaryList = p?.providers_primary ?? [];
  const flatrate = p?.flatrate ?? [];
  const free = p?.free ?? [];
  const ads = p?.ads ?? [];

  if (primary) {
    const also = primaryList.filter((x) => x && x !== primary).slice(0, 2);

    return (
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <div className="text-[11px] text-white/50">Streaming:</div>
        <ProviderBadge provider={primary} />

        {also.length > 0 ? (
          <>
            <div className="ml-1 text-[11px] text-white/40">Also:</div>
            {also.map((slug) => (
              <ProviderBadge key={slug} provider={slug} />
            ))}
          </>
        ) : null}
      </div>
    );
  }

  const best =
    flatrate.length > 0
      ? { label: "Available", items: flatrate }
      : free.length > 0
        ? { label: "Free", items: free }
        : ads.length > 0
          ? { label: "Ads", items: ads }
          : null;

  if (!best) {
    return (
      <div className="mt-2 text-[11px] text-white/40">
        No providers found (US)
      </div>
    );
  }

  const show = best.items.slice(0, 3);
  const more = best.items.length - show.length;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <div className="text-[11px] text-white/50">{best.label}:</div>
      {show.map((slug) => (
        <ProviderBadge key={slug} provider={slug} />
      ))}
      {more > 0 ? (
        <span className="text-[11px] text-white/40">+{more}</span>
      ) : null}
    </div>
  );
}

function sortFollowedShows(items: DbFollowedShow[], sortBy: FollowedSort) {
  const next = [...items];

  if (sortBy === "recent") {
    next.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return next;
  }

  if (sortBy === "title-asc") {
    next.sort((a, b) => a.title.localeCompare(b.title));
    return next;
  }

  if (sortBy === "title-desc") {
    next.sort((a, b) => b.title.localeCompare(a.title));
    return next;
  }

  next.sort((a, b) =>
    firstProviderLabel(a).localeCompare(firstProviderLabel(b))
  );
  return next;
}

function getFunctionErrorMessage(
  error: any,
  data: any,
  fallback: string
): string {
  const fromError =
    error?.context?.error ||
    error?.context?.message ||
    error?.message ||
    null;

  if (typeof fromError === "string" && fromError.trim()) {
    return fromError.trim();
  }

  const fromData = data?.error || data?.details || data?.message || null;

  if (typeof fromData === "string" && fromData.trim()) {
    return fromData.trim();
  }

  return fallback;
}

export default function LibraryClient() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [userId, setUserId] = useState<string | null>(null);

  const [followed, setFollowed] = useState<DbFollowedShow[]>([]);
  const [loadingFollowed, setLoadingFollowed] = useState(true);
  const [followedErr, setFollowedErr] = useState<string | null>(null);

  const [services, setServices] = useState<StreamingService[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(
    new Set()
  );
  const [loadingServices, setLoadingServices] = useState(true);
  const [servicesErr, setServicesErr] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState<string | null>(null);
  const [results, setResults] = useState<TmdbSearchTvResult[]>([]);

  const [followingTmdbIds, setFollowingTmdbIds] = useState<Set<number>>(
    new Set()
  );
  const [unfollowingShowIds, setUnfollowingShowIds] = useState<Set<string>>(
    new Set()
  );

  const [followedSearch, setFollowedSearch] = useState("");
  const [followedProviderFilter, setFollowedProviderFilter] = useState("all");
  const [followedSort, setFollowedSort] = useState<FollowedSort>("recent");

  const freeUsed = useMemo(
    () => Math.min(followed.length, FREE_FOLLOW_LIMIT),
    [followed.length]
  );
  const freeLimitReached = followed.length >= FREE_FOLLOW_LIMIT;

  useEffect(() => {
    let mounted = true;

    async function init() {
      const { data, error } = await supabase.auth.getUser();
      if (!mounted) return;

      if (error) {
        setUserId(null);
        return;
      }

      setUserId(data.user?.id ?? null);
    }

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const loadFollowed = useCallback(
    async (uid: string) => {
      setLoadingFollowed(true);
      setFollowedErr(null);

      try {
        const v = await supabase
          .from("v_user_shows_with_providers")
          .select("*")
          .eq("user_id", uid)
          .order("created_at", { ascending: false });

        if (!v.error) {
          const rows = (v.data ?? []).map((r: any) => ({
            user_id: r.user_id,
            show_id: r.show_id,
            created_at: r.created_at,
            poster_path: r.user_poster_path ?? null,
            tmdb_id: r.tmdb_id,
            title: r.title,
            poster_url: r.show_poster_url ?? null,
            providers_flatrate: r.providers_flatrate ?? [],
            providers_free: r.providers_free ?? [],
            providers_ads: r.providers_ads ?? [],
            providers_primary: r.providers_primary ?? [],
            primary_provider: r.primary_provider ?? null,
          })) as DbFollowedShow[];

          setFollowed(rows);
          setLoadingFollowed(false);
          return;
        }

        const basic = await supabase
          .from("user_shows")
          .select(
            `
            user_id,
            show_id,
            created_at,
            poster_path,
            shows:show_id (
              tmdb_id,
              title,
              poster_url
            )
          `
          )
          .eq("user_id", uid)
          .order("created_at", { ascending: false });

        if (basic.error) throw basic.error;

        const rows = (basic.data ?? [])
          .map((r: any) => {
            const s = r.shows;
            if (!s) return null;

            return {
              user_id: r.user_id,
              show_id: r.show_id,
              created_at: r.created_at,
              poster_path: r.poster_path ?? null,
              tmdb_id: s.tmdb_id,
              title: s.title,
              poster_url: s.poster_url ?? null,
            } as DbFollowedShow;
          })
          .filter(Boolean) as DbFollowedShow[];

        setFollowed(rows);
      } catch (e: any) {
        setFollowed([]);
        setFollowedErr(e?.message ?? "Failed to load followed shows");
      } finally {
        setLoadingFollowed(false);
      }
    },
    [supabase]
  );

  const loadUserServices = useCallback(
    async (uid: string) => {
      setLoadingServices(true);
      setServicesErr(null);

      try {
        const servicesRes = await supabase
          .from("streaming_services")
          .select("id,name,slug,active")
          .eq("active", true)
          .order("name", { ascending: true });

        if (servicesRes.error) throw servicesRes.error;

        const userServicesRes = await supabase
          .from("user_services")
          .select("service_id")
          .eq("user_id", uid);

        if (userServicesRes.error) throw userServicesRes.error;

        const nextServices = (servicesRes.data ?? []) as StreamingService[];
        const nextSelectedIds = new Set<string>(
          (userServicesRes.data ?? []).map((row: any) => row.service_id)
        );

        setServices(nextServices);
        setSelectedServiceIds(nextSelectedIds);
      } catch (e: any) {
        setServices([]);
        setSelectedServiceIds(new Set());
        setServicesErr(e?.message ?? "Failed to load selected services");
      } finally {
        setLoadingServices(false);
      }
    },
    [supabase]
  );

  useEffect(() => {
    if (!userId) {
      setFollowed([]);
      setLoadingFollowed(false);
      setServices([]);
      setSelectedServiceIds(new Set());
      setLoadingServices(false);
      return;
    }

    void Promise.all([loadFollowed(userId), loadUserServices(userId)]);
  }, [userId, loadFollowed, loadUserServices]);

  const runSearch = useCallback(async (next: string) => {
    const s = next.trim();

    if (s.length < 2) {
      setResults([]);
      setSearchErr(null);
      setSearching(false);
      return;
    }

    setSearching(true);
    setSearchErr(null);

    try {
      const r = await tmdbSearchTv(s);
      setResults(r.slice(0, 16));
    } catch (e: any) {
      setSearchErr(e?.message ?? "Search failed");
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const s = searchInput.trim();

    if (s.length < 2) {
      setResults([]);
      setSearchErr(null);
      setSearching(false);
      return;
    }

    const id = window.setTimeout(() => {
      void runSearch(searchInput);
    }, 300);

    return () => window.clearTimeout(id);
  }, [searchInput, runSearch]);

  async function getRequiredAccessToken() {
    const { data: sess, error: sessErr } = await supabase.auth.getSession();
    if (sessErr) throw new Error(sessErr.message);

    const token = sess.session?.access_token;
    if (!token) {
      throw new Error("You must be signed in to follow shows.");
    }

    return token;
  }

  async function ensureShowByTmdbId(tmdbId: number, token: string) {
    const { data, error } = await supabase.functions.invoke("ensure_show", {
      body: { tmdb_id: tmdbId },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (error || !data?.ok) {
      throw new Error(
        getFunctionErrorMessage(error, data, "Failed to ensure show.")
      );
    }

    const showRow = await supabase
      .from("shows")
      .select("id")
      .eq("tmdb_id", tmdbId)
      .maybeSingle();

    if (showRow.error) throw new Error(showRow.error.message);

    const showId = showRow.data?.id as string | undefined;
    if (!showId) {
      throw new Error("Show could not be created in the database.");
    }

    return showId;
  }

  async function syncShowByTmdbId(tmdbId: number, token: string) {
    const { data, error } = await supabase.functions.invoke("sync_show", {
      body: { tmdb_id: tmdbId },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (error || !data?.ok) {
      throw new Error(
        getFunctionErrorMessage(error, data, "Episode sync failed.")
      );
    }
  }

  async function syncShowProvidersByTmdbId(tmdbId: number, token: string) {
    const { data, error } = await supabase.functions.invoke(
      "sync_show_providers",
      {
        body: { tmdb_id: tmdbId, country: "US" },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (error || data?.ok === false) {
      throw new Error(
        getFunctionErrorMessage(error, data, "Provider sync failed.")
      );
    }
  }

  async function followByTmdbId(tmdbId: number) {
    if (!userId) {
      toast.warning("Sign in to follow shows.");
      return;
    }

    if (followingTmdbIds.has(tmdbId)) return;

    if (followed.length >= FREE_FOLLOW_LIMIT) {
      toast.warning(
        `Free plan limit reached (${FREE_FOLLOW_LIMIT} shows).`
      );
      return;
    }

    setFollowingTmdbIds((prev) => new Set(prev).add(tmdbId));

    let followSaved = false;

    try {
      const token = await getRequiredAccessToken();
      const showId = await ensureShowByTmdbId(tmdbId, token);

      const ins = await supabase.from("user_shows").upsert(
        {
          user_id: userId,
          show_id: showId,
        },
        { onConflict: "user_id,show_id", ignoreDuplicates: true }
      );

      if (ins.error) {
        const msg = String(ins.error.message || "").toLowerCase();
        if (!msg.includes("duplicate") && !msg.includes("already exists")) {
          throw new Error(ins.error.message);
        }
      }

      followSaved = true;

      await syncShowByTmdbId(tmdbId, token);

      try {
        await syncShowProvidersByTmdbId(tmdbId, token);
      } catch (providerErr) {
        console.warn("[LibraryClient] sync_show_providers failed:", providerErr);
      }

      await loadFollowed(userId);
      setSearchInput("");
      setResults([]);
      setSearchErr(null);
      toast.success("Added to your library.");
    } catch (e: any) {
      if (followSaved) {
        await loadFollowed(userId);
        toast.error(
          `Added to your library, but episode sync failed: ${e?.message ?? "Unknown error"}`
        );
      } else {
        toast.error(e?.message ?? "Follow failed");
      }
    } finally {
      setFollowingTmdbIds((prev) => {
        const next = new Set(prev);
        next.delete(tmdbId);
        return next;
      });
    }
  }

  async function unfollow(showId: string) {
    if (!userId) {
      toast.warning("Sign in to manage your library.");
      return;
    }

    if (unfollowingShowIds.has(showId)) return;

    const previous = followed;
    const nextRows = followed.filter((s) => s.show_id !== showId);

    setUnfollowingShowIds((prev) => new Set(prev).add(showId));
    setFollowed(nextRows);

    const del = await supabase
      .from("user_shows")
      .delete()
      .eq("user_id", userId)
      .eq("show_id", showId);

    if (del.error) {
      setFollowed(previous);
      toast.error(del.error.message);
    } else {
      toast.success("Removed from your library.");
    }

    setUnfollowingShowIds((prev) => {
      const next = new Set(prev);
      next.delete(showId);
      return next;
    });
  }

  const followedTmdbIds = useMemo(() => {
    const set = new Set<number>();
    for (const f of followed) set.add(f.tmdb_id);
    return set;
  }, [followed]);

  const selectedCanonicalServices = useMemo(() => {
    return mapStreamingServicesToCanonicalOptions(services, selectedServiceIds);
  }, [services, selectedServiceIds]);

  const representedCanonicalServices = useMemo(() => {
    const keys = new Set<string>();

    for (const show of followed) {
      for (const key of getShowCanonicalServiceKeys(show)) {
        keys.add(key);
      }
    }

    return mapCanonicalKeysToOptions(keys);
  }, [followed]);

  const followedProviderOptions = useMemo(() => {
    const byKey = new Map<string, CanonicalServiceOption>();

    for (const service of selectedCanonicalServices) {
      byKey.set(service.key, service);
    }

    for (const service of representedCanonicalServices) {
      byKey.set(service.key, service);
    }

    return [...byKey.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [selectedCanonicalServices, representedCanonicalServices]);

  const filteredFollowed = useMemo(() => {
    const q = followedSearch.trim().toLowerCase();

    const base = followed.filter((show) => {
      const showCanonicalKeys = getShowCanonicalServiceKeys(show);

      if (followedProviderFilter !== "all") {
        if (!showCanonicalKeys.includes(followedProviderFilter)) return false;
      }

      if (!q) return true;

      const canonicalLabels = showCanonicalKeys
        .map(
          (key) =>
            CURATED_SERVICES.find((service) => service.key === key)?.label ?? ""
        )
        .filter(Boolean);

      const haystack = [
        show.title,
        ...canonicalLabels,
        show.primary_provider,
        ...(show.providers_primary ?? []),
        ...(show.providers_flatrate ?? []),
        ...(show.providers_free ?? []),
        ...(show.providers_ads ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });

    return sortFollowedShows(base, followedSort);
  }, [followed, followedSearch, followedProviderFilter, followedSort]);

  const libraryStats = useMemo(() => {
    const providerCount = selectedCanonicalServices.length;
    const withStreaming = followed.filter(
      (show) => getShowCanonicalServiceKeys(show).length > 0
    ).length;

    return {
      total: followed.length,
      visible: filteredFollowed.length,
      providers: providerCount,
      withStreaming,
    };
  }, [followed, filteredFollowed.length, selectedCanonicalServices.length]);

  const selectedButNotRepresentedCount = useMemo(() => {
    const represented = new Set(
      representedCanonicalServices.map((service) => service.key)
    );

    return selectedCanonicalServices.filter(
      (service) => !represented.has(service.key)
    ).length;
  }, [selectedCanonicalServices, representedCanonicalServices]);

  const freeProgressPct = Math.min(
    (freeUsed / FREE_FOLLOW_LIMIT) * 100,
    100
  );
  const isLoadingPage = loadingFollowed || loadingServices;
  const pageError = followedErr ?? servicesErr;

  return (
    <div>
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-transparent p-6 ring-1 ring-white/10 md:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-8 left-8 h-40 w-40 rounded-full bg-emerald-400/5 blur-2xl"
        />

        <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 ring-1 ring-emerald-500/25">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-emerald-300">
                Your Library
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
              My Stuff
            </h1>
            <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-white/55">
              Your follow list, service view, and quick launch point for the
              shows you actually care about.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            <button
              onClick={() => router.push("/calendar")}
              className="h-10 rounded-2xl bg-white/8 px-4 text-sm font-semibold text-white ring-1 ring-white/12 transition hover:bg-white/14 hover:ring-white/20"
            >
              Calendar
            </button>
            <button
              onClick={() => router.push("/tv")}
              className="h-10 rounded-2xl bg-emerald-500 px-4 text-sm font-semibold text-black shadow-lg shadow-emerald-900/40 transition hover:bg-emerald-400"
            >
              Browse TV
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl bg-white/5 px-4 py-3.5 ring-1 ring-white/10">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
            Followed
          </div>
          <div className="mt-1 text-2xl font-extrabold tabular-nums text-white">
            {libraryStats.total}
          </div>
        </div>

        <div className="rounded-2xl bg-white/5 px-4 py-3.5 ring-1 ring-white/10">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
              Free Plan
            </div>
            <div className="text-[10px] font-semibold text-white/40">
              {freeUsed}/{FREE_FOLLOW_LIMIT}
            </div>
          </div>
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                freeLimitReached ? "bg-amber-400" : "bg-emerald-400"
              }`}
              style={{ width: `${freeProgressPct}%` }}
            />
          </div>
          <div className="mt-1.5 text-[10px] text-white/35">
            {freeLimitReached
              ? "Limit reached"
              : `${FREE_FOLLOW_LIMIT - freeUsed} remaining`}
          </div>
        </div>

        <div className="rounded-2xl bg-white/5 px-4 py-3.5 ring-1 ring-white/10">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
            Services
          </div>
          <div className="mt-1 text-2xl font-extrabold tabular-nums text-white">
            {libraryStats.providers}
          </div>
          <div className="mt-1 text-[10px] text-white/35">
            Your selected services
          </div>
        </div>

        <div className="rounded-2xl bg-white/5 px-4 py-3.5 ring-1 ring-white/10">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
            Streamable
          </div>
          <div className="mt-1 text-2xl font-extrabold tabular-nums text-white">
            {libraryStats.withStreaming}
          </div>
        </div>
      </div>

      {userId && !loadingServices ? (
        <div className="mt-3 rounded-2xl bg-white/[0.04] px-4 py-2.5 ring-1 ring-white/8">
          <p className="text-[13px] text-white/45">
            Service filter now reflects your saved service lineup from your
            account.
            {selectedButNotRepresentedCount > 0
              ? ` ${selectedButNotRepresentedCount} selected ${
                  selectedButNotRepresentedCount === 1
                    ? "service is"
                    : "services are"
                } not represented in your current followed shows yet.`
              : " All selected services are represented in your current library."}
          </p>
        </div>
      ) : null}

      <div className="mt-3">
        {freeLimitReached ? (
          <div className="flex items-center justify-between gap-4 rounded-2xl bg-amber-500/10 px-4 py-3 ring-1 ring-amber-500/25">
            <div className="flex items-center gap-2.5">
              <span className="text-amber-400">⚠</span>
              <p className="text-sm text-amber-200">
                You've reached the free plan limit of {FREE_FOLLOW_LIMIT} shows.
                Unfollow a title to add another.
              </p>
            </div>
            <button
              onClick={() => router.push("/pricing")}
              className="shrink-0 rounded-xl bg-amber-400/20 px-3 py-1.5 text-xs font-semibold text-amber-200 ring-1 ring-amber-400/30 transition hover:bg-amber-400/30"
            >
              Upgrade
            </button>
          </div>
        ) : (
          <div className="rounded-2xl bg-white/[0.04] px-4 py-2.5 ring-1 ring-white/8">
            <p className="text-[13px] text-white/45">
              Free plan — up to {FREE_FOLLOW_LIMIT} followed shows.{" "}
              <button
                onClick={() => router.push("/pricing")}
                className="text-emerald-400 underline-offset-2 hover:underline"
              >
                Upgrade for unlimited.
              </button>
            </p>
          </div>
        )}
      </div>

      <div className="mt-8 rounded-3xl bg-white/[0.04] p-5 ring-1 ring-white/10">
        <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Follow a Show</h2>
            <p className="mt-0.5 text-sm text-white/50">
              Search TMDB, open the details page, or add directly to your
              library.
            </p>
          </div>

          <div className="mt-2 text-sm md:mt-0">
            {!userId ? (
              <span className="rounded-xl bg-amber-500/10 px-3 py-1 text-xs text-amber-300 ring-1 ring-amber-500/20">
                Sign in to follow shows
              </span>
            ) : freeLimitReached ? (
              <span className="rounded-xl bg-amber-500/10 px-3 py-1 text-xs text-amber-300 ring-1 ring-amber-500/20">
                Limit reached — unfollow something first
              </span>
            ) : (
              <span className="rounded-xl bg-white/5 px-3 py-1 text-xs text-white/40 ring-1 ring-white/8">
                Type 2+ characters to search
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2.5 md:flex-row md:items-center">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
              <svg
                className="h-4 w-4 text-white/30"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </div>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search shows… (e.g., Severance)"
              className="h-12 w-full rounded-2xl bg-black/30 pl-10 pr-4 text-sm text-white ring-1 ring-white/10 placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
          </div>

          <button
            onClick={() => void runSearch(searchInput)}
            disabled={searching || searchInput.trim().length < 2}
            className="h-12 shrink-0 rounded-2xl bg-emerald-500 px-6 text-sm font-semibold text-black shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-400 disabled:opacity-50"
          >
            {searching ? "Searching…" : "Search"}
          </button>
        </div>

        {searchErr ? (
          <div className="mt-3 text-sm text-red-300">{searchErr}</div>
        ) : null}

        {results.length > 0 ? (
          <div className="mt-5 grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
            {results.map((r) => {
              const tmdbId = Number(r.id);
              const poster = tmdbPosterUrl(r.poster_path, "w185");
              const already = followedTmdbIds.has(tmdbId);
              const isFollowing = followingTmdbIds.has(tmdbId);

              return (
                <div
                  key={String(r.id)}
                  className="flex gap-3 rounded-2xl bg-black/25 p-3 ring-1 ring-white/8 transition hover:bg-black/35 hover:ring-white/14"
                >
                  <div className="relative h-[90px] w-[60px] shrink-0 overflow-hidden rounded-xl bg-white/5 ring-1 ring-white/10">
                    {poster ? (
                      <Image
                        src={poster}
                        alt={r.name}
                        fill
                        sizes="60px"
                        className="object-cover"
                      />
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-white">
                      {r.name}
                      {r.first_air_date ? (
                        <span className="ml-2 font-normal text-white/40">
                          {yearFromFirstAirDate(r.first_air_date)}
                        </span>
                      ) : null}
                    </div>

                    {r.overview ? (
                      <div className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-white/45">
                        {r.overview}
                      </div>
                    ) : null}

                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => router.push(`/tv/${tmdbId}`)}
                        className="h-8 rounded-xl bg-white/8 px-3 text-xs font-semibold text-white ring-1 ring-white/10 transition hover:bg-white/14"
                      >
                        View
                      </button>

                      <button
                        onClick={() => void followByTmdbId(tmdbId)}
                        disabled={
                          !userId ||
                          already ||
                          isFollowing ||
                          freeLimitReached
                        }
                        className={`h-8 rounded-xl px-3 text-xs font-semibold transition disabled:opacity-50 ${
                          already
                            ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30"
                            : "bg-emerald-500 text-black shadow-sm shadow-emerald-900/30 hover:bg-emerald-400"
                        }`}
                        title={
                          !userId
                            ? "Sign in to follow"
                            : already
                              ? "Already following"
                              : isFollowing
                                ? "Following…"
                                : freeLimitReached
                                  ? "Free plan limit reached"
                                  : "Follow"
                        }
                      >
                        {already
                          ? "✓ Following"
                          : isFollowing
                            ? "Adding…"
                            : "+ Follow"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : searchInput.trim().length >= 2 && !searching && !searchErr ? (
          <div className="mt-4 rounded-2xl bg-black/20 px-4 py-3.5 text-sm text-white/45 ring-1 ring-white/8">
            No matching shows found.
          </div>
        ) : null}
      </div>

      <div className="mt-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              Followed Shows
            </h2>
            <p className="mt-1 text-sm text-white/50">
              Manage your library, filter by service, and jump into details
              fast.
            </p>
          </div>

          <div className="text-sm text-white/40">
            {libraryStats.visible} showing
            {libraryStats.visible !== libraryStats.total
              ? ` of ${libraryStats.total}`
              : ""}
          </div>
        </div>

        <div className="mt-4 grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_220px_170px]">
          <div className="relative rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10 transition focus-within:ring-emerald-500/30">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
              Search Library
            </div>
            <input
              value={followedSearch}
              onChange={(e) => setFollowedSearch(e.target.value)}
              placeholder="Filter followed shows…"
              className="mt-1.5 w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
            />
          </div>

          <div className="rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
              Service
            </div>
            <select
              value={followedProviderFilter}
              onChange={(e) => setFollowedProviderFilter(e.target.value)}
              className="mt-1.5 w-full bg-transparent text-sm text-white outline-none"
            >
              <option value="all" className="bg-[#0B0F14]">
                All services
              </option>
              {followedProviderOptions.map((service) => (
                <option
                  key={service.key}
                  value={service.key}
                  className="bg-[#0B0F14]"
                >
                  {service.label}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
              Sort
            </div>
            <select
              value={followedSort}
              onChange={(e) => setFollowedSort(e.target.value as FollowedSort)}
              className="mt-1.5 w-full bg-transparent text-sm text-white outline-none"
            >
              <option value="recent" className="bg-[#0B0F14]">
                Recently added
              </option>
              <option value="title-asc" className="bg-[#0B0F14]">
                Title A–Z
              </option>
              <option value="title-desc" className="bg-[#0B0F14]">
                Title Z–A
              </option>
              <option value="provider" className="bg-[#0B0F14]">
                Service
              </option>
            </select>
          </div>
        </div>

        {isLoadingPage ? (
          <div className="mt-4 rounded-3xl bg-white/5 p-8 text-sm text-white/50 ring-1 ring-white/10">
            Loading your library…
          </div>
        ) : pageError ? (
          <div className="mt-4 rounded-3xl bg-red-500/10 p-6 text-sm text-red-200 ring-1 ring-red-500/25">
            {pageError}
          </div>
        ) : followed.length === 0 ? (
          <div className="mt-4 rounded-3xl bg-white/[0.04] p-10 text-center ring-1 ring-white/8">
            <div className="text-3xl">📺</div>
            <div className="mt-3 text-sm font-semibold text-white/70">
              Your library is empty
            </div>
            <div className="mt-1 text-sm text-white/40">
              Use the search above to follow your first show.
            </div>
          </div>
        ) : filteredFollowed.length === 0 ? (
          <div className="mt-4 rounded-3xl bg-white/[0.04] p-8 text-center ring-1 ring-white/8">
            <div className="text-sm text-white/50">
              No shows match your current filters.
            </div>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {filteredFollowed.map((show) => {
              const poster =
                tmdbPosterUrl(show.poster_path ?? null, "w342") ??
                show.poster_url ??
                null;
              const isUnfollowing = unfollowingShowIds.has(show.show_id);

              return (
                <div
                  key={show.show_id}
                  className="group overflow-hidden rounded-2xl bg-white/[0.04] ring-1 ring-white/10 transition hover:shadow-xl hover:shadow-black/40 hover:ring-emerald-500/30"
                >
                  <Link href={`/tv/${show.tmdb_id}`} className="block">
                    <div className="relative aspect-[2/3] bg-black/40">
                      {poster ? (
                        <Image
                          src={poster}
                          alt={show.title}
                          fill
                          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
                          className="object-cover transition duration-300 group-hover:scale-[1.03]"
                        />
                      ) : null}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                      <div className="pointer-events-none absolute inset-0 bg-emerald-500/0 transition duration-300 group-hover:bg-emerald-500/5" />
                    </div>
                  </Link>

                  <div className="p-3">
                    <div className="truncate text-sm font-semibold text-white">
                      {show.title}
                    </div>
                    <div className="mt-0.5 text-[11px] text-white/35">
                      Added {formatAddedDate(show.created_at)}
                    </div>

                    {renderProvidersRow({
                      primary_provider: show.primary_provider ?? null,
                      providers_primary: show.providers_primary ?? [],
                      flatrate: show.providers_flatrate ?? [],
                      free: show.providers_free ?? [],
                      ads: show.providers_ads ?? [],
                    })}

                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => void unfollow(show.show_id)}
                        disabled={isUnfollowing}
                        className="h-8 flex-1 rounded-xl bg-white/6 text-xs font-semibold text-white/70 ring-1 ring-white/8 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                      >
                        {isUnfollowing ? "Removing…" : "Unfollow"}
                      </button>

                      <button
                        onClick={() => router.push(`/tv/${show.tmdb_id}`)}
                        className="h-8 flex-1 rounded-xl bg-white/6 text-xs font-semibold text-white/70 ring-1 ring-white/8 transition hover:bg-white/10 hover:text-white"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}