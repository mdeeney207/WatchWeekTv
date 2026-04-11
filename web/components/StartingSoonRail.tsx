"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";

import PosterTile from "@/components/PosterTile";
import { useAuth } from "@/components/AuthProvider";
import type { HomeCandidate } from "@/lib/home/types";

type StartingSoonRailProps = {
  items?: HomeCandidate[];
};

const STARTING_SOON_WINDOW_MS = 6 * 60 * 60 * 1000;

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function minutesUntil(target: Date) {
  return Math.max(0, Math.round((target.getTime() - Date.now()) / 60000));
}

function getAirDateMs(candidate: HomeCandidate): number | null {
  if (!candidate.airDateUtc) return null;

  const ms = new Date(candidate.airDateUtc).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function getNumericRouteId(candidate: HomeCandidate): number | null {
  const raw = candidate.tmdbId ?? candidate.showId ?? candidate.id;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function getShowKey(item: HomeCandidate) {
  const raw =
    item.showId ??
    item.tmdbId ??
    item.id ??
    (typeof item.title === "string" ? item.title.trim().toLowerCase() : "");

  return String(raw ?? "").trim().toLowerCase();
}

function isStrictStartingSoonCandidate(
  candidate: HomeCandidate,
  nowMs: number
) {
  if (!candidate) return false;
  if (!candidate.title) return false;
  if (candidate.releaseStatus !== "starting_soon") return false;
  if (candidate.isScheduleVerified !== true) return false;

  const airMs = getAirDateMs(candidate);
  if (airMs === null) return false;

  const deltaMs = airMs - nowMs;
  if (deltaMs < 0) return false;
  if (deltaMs > STARTING_SOON_WINDOW_MS) return false;

  if (getNumericRouteId(candidate) === null) return false;

  return true;
}

function buildCountdownLabel(candidate: HomeCandidate) {
  if (!candidate.airDateUtc) return "Soon";

  const t = new Date(candidate.airDateUtc);
  if (!Number.isFinite(t.getTime())) return "Soon";

  const mins = minutesUntil(t);

  if (mins <= 5) return "Now";
  if (mins < 60) return `in ${mins}m`;

  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;

  if (hrs < 24 && rem > 0) return `in ${hrs}h ${rem}m`;
  if (hrs < 24) return `in ${hrs}h`;

  const days = Math.floor(hrs / 24);
  return `in ${days}d`;
}

function buildNextEpisodeLabel(candidate: HomeCandidate) {
  if (!candidate.airDateUtc) {
    if (candidate.episodeTitle) return candidate.episodeTitle;
    return "Next episode soon";
  }

  const air = new Date(candidate.airDateUtc);
  if (!Number.isFinite(air.getTime())) {
    if (candidate.episodeTitle) return candidate.episodeTitle;
    return "Next episode soon";
  }

  const timeLabel = air.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  const bits: string[] = [];

  if (candidate.seasonNumber != null && candidate.episodeNumber != null) {
    bits.push(`S${candidate.seasonNumber} E${candidate.episodeNumber}`);
  }

  if (candidate.episodeTitle) {
    bits.push(candidate.episodeTitle);
  }

  if (bits.length) {
    return `${bits.join(" • ")} • ${timeLabel}`;
  }

  return `Next episode • ${timeLabel}`;
}

export default function StartingSoonRail({
  items = [],
}: StartingSoonRailProps) {
  const router = useRouter();
  const { userId } = useAuth();

  const safeItems = useMemo(() => {
    const nowMs = Date.now();
    const seenShows = new Set<string>();

    return (items ?? [])
      .filter((item) => isStrictStartingSoonCandidate(item, nowMs))
      .sort((a, b) => {
        const aMs = getAirDateMs(a) ?? Number.MAX_SAFE_INTEGER;
        const bMs = getAirDateMs(b) ?? Number.MAX_SAFE_INTEGER;
        return aMs - bMs;
      })
      .filter((item) => {
        const showKey = getShowKey(item);
        if (!showKey) return false;
        if (seenShows.has(showKey)) return false;
        seenShows.add(showKey);
        return true;
      })
      .slice(0, 12);
  }, [items]);

  const hasItems = safeItems.length > 0;

  const subtitle = useMemo(() => {
    if (!userId) return "Log in to see your personal countdown";
    return "Verified releases in the next 6 hours";
  }, [userId]);

  if (userId && !hasItems) {
    return null;
  }

  return (
    <section>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-semibold tracking-tight text-white">
            Starting Soon
          </h2>
          <div className="mt-1 text-sm text-zinc-400">{subtitle}</div>
        </div>

        <button
          type="button"
          onClick={() => router.push("/calendar")}
          className="shrink-0 text-sm font-medium text-zinc-300 transition hover:text-white"
        >
          View all →
        </button>
      </div>

      <div className="mt-4">
        {!userId ? (
          <InlineState
            tone="default"
            title="Log in for your countdown"
            detail="Starting Soon becomes personalized once you’re signed in."
            ctaLabel="Log in"
            onClick={() => router.push("/login")}
          />
        ) : (
          <div className="-mx-4 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] sm:-mx-6 lg:-mx-10 [&::-webkit-scrollbar]:hidden">
            <div className="flex gap-4 px-4 sm:px-6 lg:px-10">
              {safeItems.map((item, index) => {
                const tmdbId = getNumericRouteId(item);

                if (tmdbId === null) return null;

                return (
                  <PosterTile
                    key={getShowKey(item)}
                    tmdbId={tmdbId}
                    title={item.title}
                    posterUrl={item.posterUrl ?? undefined}
                    provider={item.providerName ?? item.provider ?? undefined}
                    nextEpisodeLabel={buildNextEpisodeLabel(item)}
                    countdownLabel={buildCountdownLabel(item)}
                    priority={index < 3}
                    primaryLabel="Watch"
                    secondaryLabel="Details"
                    onPrimary={() => router.push(`/tv/${tmdbId}`)}
                    onSecondary={() => router.push(`/tv/${tmdbId}`)}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function InlineState({
  title,
  detail,
  ctaLabel,
  onClick,
  tone = "default",
}: {
  title: string;
  detail: string;
  ctaLabel: string;
  onClick: () => void;
  tone?: "default" | "error";
}) {
  const toneClass =
    tone === "error"
      ? "border-red-500/20 bg-red-500/[0.06]"
      : "border-white/10 bg-white/[0.035]";

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        toneClass
      )}
    >
      <div className="min-w-0">
        <div className="text-sm font-semibold text-zinc-100">{title}</div>
        <div className="mt-1 text-xs text-zinc-400">{detail}</div>
      </div>

      <button
        type="button"
        onClick={onClick}
        className="h-9 shrink-0 rounded-xl bg-white px-4 text-xs font-semibold text-black transition hover:bg-zinc-200"
      >
        {ctaLabel}
      </button>
    </div>
  );
}