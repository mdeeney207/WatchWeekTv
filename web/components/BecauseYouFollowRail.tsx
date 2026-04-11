"use client";

import Image from "next/image";
import React, { useMemo } from "react";
import { useRouter } from "next/navigation";

import { shimmerBlurDataURL } from "@/lib/imagePlaceholders";
import type { HomeCandidate } from "@/lib/home/types";

function slugify(value?: string | null) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function normalizeToken(value?: string | number | null) {
  const raw = String(value ?? "").trim().toLowerCase();
  return raw || null;
}

function normalizeTitleKey(value?: string | null) {
  const raw = String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");

  return raw || null;
}

function getNumericTmdbId(item: HomeCandidate): number | null {
  const value = Number(item.tmdbId);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function buildWhereToWatchHref(title: string, tmdbId: string | number) {
  const safeTitle = slugify(title);
  const safeId = Number(tmdbId);

  if (!safeTitle || !Number.isFinite(safeId) || safeId <= 0) {
    return `/tv/${tmdbId}`;
  }

  return `/where-to-watch/${safeTitle}-${safeId}`;
}

function getReasonLabel(item: HomeCandidate) {
  if (item.reasonLabel?.trim()) return item.reasonLabel.trim();

  if (item.seedShowTitle?.trim()) {
    return `Because you follow ${item.seedShowTitle.trim()}`;
  }

  if (item.relationship === "recommended") {
    return "Recommended from your library";
  }

  return "Recommended for you";
}

function buildDedupAliases(item: HomeCandidate) {
  const aliases: string[] = [];

  const tmdbId = getNumericTmdbId(item);
  if (tmdbId !== null) {
    aliases.push(`tmdb:${tmdbId}`);
  }

  const showId = normalizeToken(item.showId);
  if (showId) {
    aliases.push(`show:${showId}`);
  }

  const id = normalizeToken(item.id);
  if (id) {
    aliases.push(`id:${id}`);
  }

  const titleKey = normalizeTitleKey(item.title);
  if (titleKey) {
    aliases.push(`title:${titleKey}`);
  }

  return Array.from(new Set(aliases));
}

function getStableCardKey(item: HomeCandidate) {
  const tmdbId = getNumericTmdbId(item);
  if (tmdbId !== null) return `tmdb:${tmdbId}`;

  return (
    buildDedupAliases(item)[0] ??
    `fallback:${String(item.title ?? item.id ?? "unknown")}`
  );
}

export default function BecauseYouFollowRail({
  items = [],
}: {
  items?: HomeCandidate[];
}) {
  const router = useRouter();

  const recommendations = useMemo(() => {
    const seenAliases = new Set<string>();

    return (items ?? [])
      .filter((item) => Boolean(item && item.title))
      .filter((item) => getNumericTmdbId(item) !== null)
      .filter((item) => item.relationship !== "followed")
      .filter((item) => {
        const aliases = buildDedupAliases(item);
        if (aliases.length === 0) return false;

        const alreadySeen = aliases.some((alias) => seenAliases.has(alias));
        if (alreadySeen) return false;

        for (const alias of aliases) {
          seenAliases.add(alias);
        }

        return true;
      })
      .slice(0, 12);
  }, [items]);

  if (!recommendations.length) {
    return null;
  }

  return (
    <section>
      <div className="flex items-end justify-between gap-4">
        <div className="max-w-2xl">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Recommendations
          </div>
          <h2 className="mt-2 text-[28px] font-semibold tracking-tight text-white md:text-[32px]">
            Because You Follow
          </h2>
          <div className="mt-2 text-sm leading-6 text-zinc-400 md:text-[15px]">
            Smart picks connected to the shows already in your library.
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push("/library")}
          className="shrink-0 text-sm font-medium text-zinc-300 transition hover:text-white"
        >
          View library →
        </button>
      </div>

      <div className="-mx-4 mt-6 overflow-x-auto overflow-y-visible pb-2 [scrollbar-width:none] [-ms-overflow-style:none] sm:-mx-6 lg:-mx-10 [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-5 px-4 pr-16 sm:px-6 sm:pr-20 lg:px-10 lg:pr-24">
          {recommendations.map((item) => {
            const tmdbId = getNumericTmdbId(item);

            if (tmdbId === null) return null;

            return (
              <RecommendationCard
                key={getStableCardKey(item)}
                item={item}
                onOpenGuide={() =>
                  router.push(buildWhereToWatchHref(item.title, tmdbId))
                }
                onOpenDetails={() => router.push(`/tv/${tmdbId}`)}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

function RecommendationCard({
  item,
  onOpenGuide,
  onOpenDetails,
}: {
  item: HomeCandidate;
  onOpenGuide: () => void;
  onOpenDetails: () => void;
}) {
  const reason = getReasonLabel(item);
  const imageSrc = item.posterUrl ?? item.backdropUrl ?? null;
  const providerLabel = item.providerName ?? item.provider ?? null;

  return (
    <div className="group w-[300px] shrink-0 overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] shadow-[0_22px_70px_-36px_rgba(0,0,0,1)] ring-1 ring-white/5 transition duration-300 hover:-translate-y-1.5 hover:bg-white/[0.06] hover:ring-white/15">
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-white/5">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={item.title}
            fill
            sizes="300px"
            quality={80}
            unoptimized
            placeholder="blur"
            blurDataURL={shimmerBlurDataURL(600, 900)}
            className="object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_60%)]" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/18 to-transparent" />

        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <div className="inline-flex rounded-full bg-black/50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-100 ring-1 ring-white/10 backdrop-blur-md">
            Because you follow
          </div>

          {providerLabel ? (
            <div className="inline-flex rounded-full bg-black/50 px-3 py-1 text-[10px] font-semibold text-zinc-200 ring-1 ring-white/10 backdrop-blur-md">
              {providerLabel}
            </div>
          ) : null}
        </div>
      </div>

      <div className="p-4">
        <div className="line-clamp-2 text-[26px] font-semibold leading-tight tracking-tight text-white">
          {item.title}
        </div>

        <div className="mt-2 min-h-[44px] text-sm leading-6 text-zinc-400">
          {reason}
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={onOpenGuide}
            className="h-11 flex-1 rounded-2xl bg-white px-4 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            Streaming guide
          </button>

          <button
            onClick={onOpenDetails}
            className="h-11 rounded-2xl bg-white/5 px-4 text-sm font-medium text-zinc-100 ring-1 ring-white/10 transition hover:bg-white/10"
          >
            Details
          </button>
        </div>
      </div>
    </div>
  );
}