// web/components/TonightPicksRail.tsx
"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import PosterTile from "@/components/PosterTile";
import { shimmerBlurDataURL } from "@/lib/imagePlaceholders";
import type { HomeCandidate } from "@/lib/home/types";

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function formatTime(d: Date) {
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDowMonthDay(d: Date) {
  return d.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function minutesUntil(target: Date) {
  return Math.round((target.getTime() - Date.now()) / 60000);
}

function hoursFromNowLabel(target: Date) {
  const ms = target.getTime() - Date.now();
  if (ms <= 0) return "Now";

  const mins = Math.round(ms / 60000);
  if (mins < 60) return `in ${mins}m`;

  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;

  return rem ? `in ${hrs}h ${rem}m` : `in ${hrs}h`;
}

function buildPosterCountdownLabel(target: Date) {
  const mins = minutesUntil(target);

  if (mins <= 5) return "Now";
  if (mins < 60) return `in ${mins}m`;

  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;

  if (hrs < 24 && rem > 0) return `in ${hrs}h ${rem}m`;
  if (hrs < 24) return `in ${hrs}h`;

  const days = Math.floor(hrs / 24);
  return `in ${days}d`;
}

function buildPosterEpisodeLabel(item: HomeCandidate, t: Date) {
  const bits: string[] = [];

  if (item.seasonNumber != null && item.episodeNumber != null) {
    bits.push(`S${item.seasonNumber} E${item.episodeNumber}`);
  }

  if (item.episodeTitle) {
    bits.push(item.episodeTitle);
  }

  bits.push(formatTime(t));

  return bits.join(" • ");
}

function openBestWatchTarget(
  item: HomeCandidate,
  router: ReturnType<typeof useRouter>
) {
  const maybeTarget =
    typeof (item as { rokuDeepLink?: string | null }).rokuDeepLink === "string"
      ? (item as { rokuDeepLink?: string | null }).rokuDeepLink
      : typeof (item as { serviceWebUrl?: string | null }).serviceWebUrl ===
          "string"
        ? (item as { serviceWebUrl?: string | null }).serviceWebUrl
        : null;

  if (maybeTarget) {
    window.open(maybeTarget, "_blank", "noopener,noreferrer");
    return;
  }

  router.push("/calendar");
}

export default function TonightPicksRail({
  items = [],
}: {
  items?: HomeCandidate[];
}) {
  const router = useRouter();

  const picks = useMemo(() => {
    return (items ?? [])
      .map((item) => ({
        item,
        airDate: new Date(item.airDateUtc),
      }))
      .filter(
        ({ item, airDate }) =>
          !!item &&
          !!item.tmdbId &&
          !!item.title &&
          !!item.airDateUtc &&
          Number.isFinite(airDate.getTime())
      )
      .slice(0, 12);
  }, [items]);

  if (!picks.length) {
    return null;
  }

  return (
    <section className="pt-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-semibold tracking-tight text-white">
            Tonight Picks
          </h2>
          <div className="mt-1 text-sm text-zinc-400">
            Best things to watch next, ranked by urgency
          </div>
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
        {picks.length === 1 ? (
          <FeaturedPickCard
            rank={1}
            item={picks[0].item}
            airDate={picks[0].airDate}
            onPrimaryClick={() => openBestWatchTarget(picks[0].item, router)}
            onSecondaryClick={() => router.push("/calendar")}
          />
        ) : picks.length === 2 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {picks.map(({ item, airDate }, idx) => (
              <FeaturedPickCard
                key={item.id}
                rank={idx + 1}
                item={item}
                airDate={airDate}
                onPrimaryClick={() => openBestWatchTarget(item, router)}
                onSecondaryClick={() => router.push("/calendar")}
              />
            ))}
          </div>
        ) : (
          <div className="-mx-4 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] sm:-mx-6 lg:-mx-10 [&::-webkit-scrollbar]:hidden">
            <div className="flex gap-4 px-4 sm:px-6 lg:px-10">
              {picks.map(({ item, airDate }, idx) => {
                const tmdbId = Number(item.tmdbId);

                if (!Number.isFinite(tmdbId)) return null;

                return (
                  <div key={item.id} className="relative shrink-0">
                    <div className="pointer-events-none absolute left-3 top-3 z-10">
                      <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-black/70 px-2 text-[11px] font-semibold text-white ring-1 ring-white/15 backdrop-blur">
                        #{idx + 1}
                      </span>
                    </div>

                    <PosterTile
                      tmdbId={tmdbId}
                      title={item.title}
                      posterUrl={item.posterUrl ?? null}
                      provider={item.providerName ?? undefined}
                      nextEpisodeLabel={buildPosterEpisodeLabel(item, airDate)}
                      countdownLabel={buildPosterCountdownLabel(airDate)}
                      priority={idx < 3}
                      primaryLabel="Watch"
                      secondaryLabel="Calendar"
                      onPrimary={() => openBestWatchTarget(item, router)}
                      onSecondary={() => router.push("/calendar")}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function FeaturedPickCard({
  rank,
  item,
  airDate,
  onPrimaryClick,
  onSecondaryClick,
}: {
  rank: number;
  item: HomeCandidate;
  airDate: Date;
  onPrimaryClick: () => void;
  onSecondaryClick: () => void;
}) {
  const sxxexx =
    item.seasonNumber != null || item.episodeNumber != null
      ? `S${String(item.seasonNumber ?? "??").padStart(2, "0")}E${String(
          item.episodeNumber ?? "??"
        ).padStart(2, "0")}`
      : null;

  const episodeLine =
    sxxexx && item.episodeTitle
      ? `${sxxexx} • ${item.episodeTitle}`
      : sxxexx || item.episodeTitle || "Upcoming episode";

  const summary =
    typeof (item as { overview?: string | null }).overview === "string" &&
    (item as { overview?: string | null }).overview?.trim()
      ? (item as { overview?: string | null }).overview!.trim()
      : "One of your best next watches based on timing, urgency, and platform relevance.";

  return (
    <div className="overflow-hidden rounded-[30px] bg-white/[0.045] ring-1 ring-white/10">
      <div className="grid min-h-[340px] md:grid-cols-[minmax(260px,360px)_1fr]">
        <div className="relative min-h-[260px] bg-white/5">
          {item.posterUrl ? (
            <Image
              src={item.posterUrl}
              alt={item.title}
              fill
              sizes="(max-width: 768px) 100vw, 360px"
              quality={78}
              unoptimized
              placeholder="blur"
              blurDataURL={shimmerBlurDataURL(700, 1000)}
              className="object-cover"
            />
          ) : null}

          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />

          <div className="absolute left-4 top-4 flex items-center gap-2">
            <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-black/70 px-2 text-xs font-semibold text-white ring-1 ring-white/15 backdrop-blur">
              #{rank}
            </span>

            {item.providerName ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-zinc-100 ring-1 ring-white/10 backdrop-blur-sm">
                <span>{item.providerName}</span>
              </span>
            ) : null}
          </div>

          <div className="absolute inset-x-4 bottom-4 rounded-[24px] border border-white/10 bg-black/45 p-4 backdrop-blur-md">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Starts
            </div>
            <div className="mt-2 line-clamp-1 text-lg font-semibold text-white">
              {item.episodeTitle ?? "Next episode"}
            </div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-white">
              {hoursFromNowLabel(airDate)}
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between p-6 md:p-7">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Ranked pick
            </div>

            <h3 className="mt-3 text-3xl font-semibold tracking-tight text-white">
              {item.title}
            </h3>

            <div className="mt-3 text-sm font-medium text-zinc-300">
              {episodeLine}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-zinc-300">
              {item.providerName ? (
                <>
                  <span className="font-semibold text-zinc-100">
                    {item.providerName}
                  </span>
                  <span className="text-zinc-600">•</span>
                </>
              ) : null}

              <span>{formatDowMonthDay(airDate)}</span>
              <span className="text-zinc-600">•</span>
              <span>{formatTime(airDate)}</span>
              <span className="text-zinc-600">•</span>
              <span className="font-semibold text-zinc-100">
                {hoursFromNowLabel(airDate)}
              </span>
            </div>

            <p className="mt-5 max-w-2xl text-sm leading-6 text-zinc-400">
              {summary}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={onPrimaryClick}
              className="h-11 rounded-2xl bg-white px-5 text-sm font-semibold text-black transition hover:bg-zinc-200"
            >
              Watch now
            </button>
            <button
              onClick={onSecondaryClick}
              className="h-11 rounded-2xl bg-white/[0.04] px-5 text-sm font-medium text-zinc-200 ring-1 ring-white/10 transition hover:bg-white/[0.08] hover:text-white"
            >
              View calendar
            </button>
          </div>
        </div>
      </div>
    </div>
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