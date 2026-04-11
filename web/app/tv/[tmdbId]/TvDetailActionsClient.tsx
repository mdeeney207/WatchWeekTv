"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase-browser";
import { FREE_FOLLOW_LIMIT } from "@/lib/billing";

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

  const fromData =
    data?.error ||
    data?.details ||
    data?.message ||
    null;

  if (typeof fromData === "string" && fromData.trim()) {
    return fromData.trim();
  }

  return fallback;
}

export default function TvDetailActionsClient({
  tmdbId,
  title,
  whereToWatchHref,
}: {
  tmdbId: number;
  title: string;
  whereToWatchHref?: string | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const { userId, loading: authLoading } = useAuth();

  const [statusLoading, setStatusLoading] = useState(true);
  const [dbShowId, setDbShowId] = useState<string | null>(null);
  const [isFollowed, setIsFollowed] = useState(false);
  const [trackedCount, setTrackedCount] = useState(0);
  const [actionBusy, setActionBusy] = useState<"follow" | "unfollow" | null>(
    null
  );

  const refreshStatus = useCallback(async () => {
    if (!userId) {
      setDbShowId(null);
      setIsFollowed(false);
      setTrackedCount(0);
      setStatusLoading(false);
      return;
    }

    setStatusLoading(true);

    try {
      const [countRes, showRes] = await Promise.all([
        supabase
          .from("user_shows")
          .select("show_id", { count: "exact", head: true })
          .eq("user_id", userId),
        supabase.from("shows").select("id").eq("tmdb_id", tmdbId).maybeSingle(),
      ]);

      if (countRes.error) throw countRes.error;
      if (showRes.error) throw showRes.error;

      const nextShowId = (showRes.data?.id as string | undefined) ?? null;
      let nextFollowed = false;

      if (nextShowId) {
        const followRes = await supabase
          .from("user_shows")
          .select("show_id")
          .eq("user_id", userId)
          .eq("show_id", nextShowId)
          .maybeSingle();

        if (followRes.error) throw followRes.error;
        nextFollowed = Boolean(followRes.data?.show_id);
      }

      setTrackedCount(countRes.count ?? 0);
      setDbShowId(nextShowId);
      setIsFollowed(nextFollowed);
    } catch (e) {
      console.error("[TvDetailActionsClient] refreshStatus failed:", e);
      setDbShowId(null);
      setIsFollowed(false);
    } finally {
      setStatusLoading(false);
    }
  }, [supabase, tmdbId, userId]);

  useEffect(() => {
    if (authLoading) return;
    void refreshStatus();
  }, [authLoading, refreshStatus]);

  async function getRequiredAccessToken() {
    const { data: sess, error: sessErr } = await supabase.auth.getSession();
    if (sessErr) throw new Error(sessErr.message);

    const token = sess.session?.access_token;
    if (!token) {
      throw new Error("You must be signed in to follow shows.");
    }

    return token;
  }

  async function ensureShowByTmdbId(nextTmdbId: number, token: string) {
    const { data, error } = await supabase.functions.invoke("ensure_show", {
      body: { tmdb_id: nextTmdbId },
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
      .eq("tmdb_id", nextTmdbId)
      .maybeSingle();

    if (showRow.error) throw new Error(showRow.error.message);

    const showId = showRow.data?.id as string | undefined;
    if (!showId) {
      throw new Error("Show could not be created in the database.");
    }

    return showId;
  }

  async function syncShowByTmdbId(nextTmdbId: number, token: string) {
    const { data, error } = await supabase.functions.invoke("sync_show", {
      body: { tmdb_id: nextTmdbId },
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

  async function syncShowProvidersByTmdbId(nextTmdbId: number, token: string) {
    const { data, error } = await supabase.functions.invoke(
      "sync_show_providers",
      {
        body: { tmdb_id: nextTmdbId, country: "US" },
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

  const followShow = useCallback(async () => {
    if (!userId) {
      toast.warning("Sign in to follow shows.");
      return;
    }

    if (actionBusy || statusLoading || isFollowed) return;

    if (trackedCount >= FREE_FOLLOW_LIMIT) {
      toast.warning(
        `Free plan limit reached (${FREE_FOLLOW_LIMIT} shows).`
      );
      return;
    }

    const prevShowId = dbShowId;
    const prevFollowed = isFollowed;
    const prevTrackedCount = trackedCount;

    setActionBusy("follow");
    setIsFollowed(true);
    setTrackedCount((prev) => prev + 1);

    let ensuredShowId: string | null = null;
    let followSaved = false;

    try {
      const token = await getRequiredAccessToken();
      ensuredShowId = await ensureShowByTmdbId(tmdbId, token);

      const ins = await supabase.from("user_shows").upsert(
        {
          user_id: userId,
          show_id: ensuredShowId,
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
        console.warn(
          "[TvDetailActionsClient] sync_show_providers failed:",
          providerErr
        );
      }

      setDbShowId(ensuredShowId);
      toast.success(`Added ${title} to My Stuff.`);
    } catch (e: any) {
      if (followSaved && ensuredShowId) {
        setDbShowId(ensuredShowId);
        setIsFollowed(true);
        setTrackedCount(prevTrackedCount + 1);
        toast.error(
          `Added ${title} to My Stuff, but episode sync failed: ${e?.message ?? "Unknown error"}`
        );
      } else {
        setDbShowId(prevShowId);
        setIsFollowed(prevFollowed);
        setTrackedCount(prevTrackedCount);
        toast.error(e?.message ?? "Failed to follow show.");
      }
    } finally {
      setActionBusy(null);
      void refreshStatus();
    }
  }, [
    actionBusy,
    dbShowId,
    isFollowed,
    refreshStatus,
    statusLoading,
    supabase,
    title,
    tmdbId,
    trackedCount,
    userId,
  ]);

  const unfollowShow = useCallback(async () => {
    if (!userId) {
      toast.warning("Sign in to manage your library.");
      return;
    }

    if (actionBusy || statusLoading || !isFollowed) return;

    const prevShowId = dbShowId;
    const prevFollowed = isFollowed;
    const prevTrackedCount = trackedCount;

    setActionBusy("unfollow");
    setIsFollowed(false);
    setTrackedCount((prev) => Math.max(0, prev - 1));

    try {
      let showIdToDelete = dbShowId;

      if (!showIdToDelete) {
        const showRow = await supabase
          .from("shows")
          .select("id")
          .eq("tmdb_id", tmdbId)
          .maybeSingle();

        if (showRow.error) throw new Error(showRow.error.message);
        showIdToDelete = (showRow.data?.id as string | undefined) ?? null;
      }

      if (!showIdToDelete) {
        throw new Error("Show record not found.");
      }

      const del = await supabase
        .from("user_shows")
        .delete()
        .eq("user_id", userId)
        .eq("show_id", showIdToDelete);

      if (del.error) {
        throw new Error(del.error.message);
      }

      setDbShowId(showIdToDelete);
      toast.success(`Removed ${title} from My Stuff.`);
    } catch (e: any) {
      setDbShowId(prevShowId);
      setIsFollowed(prevFollowed);
      setTrackedCount(prevTrackedCount);
      toast.error(e?.message ?? "Failed to remove show.");
    } finally {
      setActionBusy(null);
      void refreshStatus();
    }
  }, [
    actionBusy,
    dbShowId,
    isFollowed,
    refreshStatus,
    statusLoading,
    supabase,
    title,
    tmdbId,
    trackedCount,
    userId,
  ]);

  if (authLoading || statusLoading) {
    return (
      <div className="rounded-[24px] bg-white/[0.07] p-4 ring-1 ring-white/10 backdrop-blur-md">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
          WatchWeek actions
        </div>
        <div className="mt-3 text-sm text-zinc-300">Checking your library…</div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="rounded-[24px] bg-white/[0.07] p-4 ring-1 ring-white/10 backdrop-blur-md">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
              WatchWeek actions
            </div>
            <div className="mt-2 text-sm font-semibold text-white">
              Sign in to follow this show
            </div>
            <div className="mt-1 text-sm text-zinc-400">
              Save {title} to My Stuff so your calendar and homepage can surface it
              when episodes drop.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/login"
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-white px-4 text-sm font-semibold text-black transition hover:bg-zinc-200"
            >
              Sign in
            </Link>
            <Link
              href="/calendar"
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-white/10 px-4 text-sm font-semibold text-white ring-1 ring-white/10 transition hover:bg-white/15"
            >
              Calendar
            </Link>
            {whereToWatchHref ? (
              <Link
                href={whereToWatchHref}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-white/10 px-4 text-sm font-semibold text-white ring-1 ring-white/10 transition hover:bg-white/15"
              >
                Streaming guide
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  const limitText = `${Math.min(trackedCount, FREE_FOLLOW_LIMIT)}/${FREE_FOLLOW_LIMIT}`;
  const primaryBusy =
    actionBusy === "follow"
      ? "Adding…"
      : actionBusy === "unfollow"
        ? "Removing…"
        : null;

  return (
    <div className="rounded-[24px] bg-white/[0.07] p-4 ring-1 ring-white/10 backdrop-blur-md">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
              WatchWeek actions
            </span>

            <span
              className={[
                "rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1",
                isFollowed
                  ? "bg-emerald-500/15 text-emerald-200 ring-emerald-400/20"
                  : "bg-white/10 text-zinc-200 ring-white/10",
              ].join(" ")}
            >
              {isFollowed ? "In My Stuff" : "Not followed"}
            </span>

            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-zinc-300 ring-1 ring-white/10">
              Free plan {limitText}
            </span>
          </div>

          <div className="mt-2 text-sm text-zinc-300">
            {isFollowed
              ? `${title} is already in your library.`
              : `Follow ${title} so it shows up in your WatchWeek flow.`}
          </div>

          <div className="mt-1 text-sm text-zinc-500">
            This affects My Stuff immediately and helps your calendar surfaces get
            more useful.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isFollowed ? (
            <button
              type="button"
              onClick={() => void unfollowShow()}
              disabled={Boolean(actionBusy)}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-white px-4 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-60"
            >
              {primaryBusy ?? "Remove from My Stuff"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void followShow()}
              disabled={Boolean(actionBusy) || trackedCount >= FREE_FOLLOW_LIMIT}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-white px-4 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-60"
              title={
                trackedCount >= FREE_FOLLOW_LIMIT
                  ? `Free plan limit reached (${FREE_FOLLOW_LIMIT} shows).`
                  : "Add to My Stuff"
              }
            >
              {primaryBusy ?? "Add to My Stuff"}
            </button>
          )}

          <Link
            href="/library"
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-white/10 px-4 text-sm font-semibold text-white ring-1 ring-white/10 transition hover:bg-white/15"
          >
            Open My Stuff
          </Link>

          <Link
            href="/calendar"
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-white/10 px-4 text-sm font-semibold text-white ring-1 ring-white/10 transition hover:bg-white/15"
          >
            Open Calendar
          </Link>

          {whereToWatchHref ? (
            <Link
              href={whereToWatchHref}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-white/10 px-4 text-sm font-semibold text-white ring-1 ring-white/10 transition hover:bg-white/15"
            >
              Streaming guide
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}