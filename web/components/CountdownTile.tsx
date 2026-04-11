// web/components/CountdownTile.tsx
"use client";

import React from "react";
import Image from "next/image";
import EpisodeCountdown from "@/components/EpisodeCountdown";
import { getProviderTheme } from "@/lib/providers";
import { shimmerBlurDataURL } from "@/lib/imagePlaceholders";

export type CountdownTileProps = {
  showTitle: string;
  episodeTitle?: string | null;
  season?: number | null;
  episode?: number | null;

  posterUrl?: string | null;
  logoUrl?: string | null;

  providerName?: string | null;
  airDateUTC: string;

  subtitle?: string | null;
  overview?: string | null;
  serviceWebUrl?: string | null;

  primaryLabel?: string;
  secondaryLabel?: string;

  onPrimaryClick?: () => void;
  onSecondaryClick?: () => void;

  className?: string;
};

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function formatSxxExx(season?: number | null, episode?: number | null) {
  if (season == null && episode == null) return "";
  const s = season != null ? String(season).padStart(2, "0") : "??";
  const e = episode != null ? String(episode).padStart(2, "0") : "??";
  return `S${s}E${e}`;
}

function formatAirTime(airDateUTC: string) {
  const d = new Date(airDateUTC);
  if (Number.isNaN(d.getTime())) return "";

  return d.toLocaleString(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatAbsoluteDate(airDateUTC: string) {
  const d = new Date(airDateUTC);
  if (Number.isNaN(d.getTime())) return "";

  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function CountdownTile({
  showTitle,
  episodeTitle,
  season,
  episode,
  posterUrl,
  logoUrl,
  providerName,
  airDateUTC,
  subtitle,
  overview,
  serviceWebUrl,
  primaryLabel = "Watch",
  secondaryLabel = "Details",
  onPrimaryClick,
  onSecondaryClick,
  className,
}: CountdownTileProps) {
  const provider = providerName?.trim() || "Streaming";
  const theme = getProviderTheme(provider);
  const sxxexx = formatSxxExx(season, episode);

  const episodeLine =
    sxxexx && episodeTitle
      ? `${sxxexx} • ${episodeTitle}`
      : sxxexx || episodeTitle || "New episode";

  const airLine = subtitle?.trim() || formatAirTime(airDateUTC);
  const absoluteDateLine = formatAbsoluteDate(airDateUTC);
  const canWatch = Boolean(serviceWebUrl || onPrimaryClick);
  const canOpenSecondary = Boolean(onSecondaryClick);
  const summary = overview?.trim() || "";

  return (
    <article
      className={cn(
        "group relative w-[278px] shrink-0 overflow-hidden rounded-[28px]",
        "bg-white/[0.045] ring-1 ring-white/10",
        "shadow-[0_10px_30px_rgba(0,0,0,0.24)]",
        "transition duration-200",
        "hover:-translate-y-1 hover:bg-white/[0.065] hover:ring-white/15 hover:shadow-[0_18px_45px_rgba(0,0,0,0.34)]",
        className
      )}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-white/5">
        {posterUrl ? (
          <Image
            src={posterUrl}
            alt={showTitle}
            fill
            sizes="278px"
            quality={70}
            unoptimized
            placeholder="blur"
            blurDataURL={shimmerBlurDataURL(480, 300)}
            className="object-cover transition duration-500 group-hover:scale-[1.035]"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_45%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))]" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/58 to-black/10" />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/35 to-transparent" />

        <div className="absolute left-3 right-3 top-3 flex items-start justify-between gap-2">
          <span
            className="inline-flex max-w-[78%] items-center gap-2 truncate rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm"
            style={{ background: theme.bg, color: theme.fg }}
            title={provider}
          >
            {logoUrl ? (
              <span className="relative h-3.5 w-3.5 shrink-0 overflow-hidden rounded-full bg-white/10">
                <Image
                  src={logoUrl}
                  alt={provider}
                  fill
                  sizes="14px"
                  unoptimized
                  className="object-contain"
                />
              </span>
            ) : null}
            <span className="truncate">{provider}</span>
          </span>

          {sxxexx ? (
            <span className="inline-flex items-center rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-semibold text-white ring-1 ring-white/10 backdrop-blur-sm">
              {sxxexx}
            </span>
          ) : null}
        </div>

        <div className="absolute inset-x-3 bottom-3">
          <div className="rounded-2xl bg-black/45 p-3 ring-1 ring-white/10 backdrop-blur-md">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
              Starts
            </div>
            <div className="mt-1">
              <EpisodeCountdown airDateUTC={airDateUTC} />
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="min-w-0">
          <h3 className="truncate text-[17px] font-semibold tracking-tight text-white">
            {showTitle}
          </h3>

          <div className="mt-1 line-clamp-1 text-sm text-zinc-300">
            {episodeLine}
          </div>

          <div className="mt-2 flex min-w-0 items-center gap-2 text-xs text-zinc-500">
            {airLine ? <span className="truncate">{airLine}</span> : null}
            {airLine && absoluteDateLine ? (
              <span className="h-1 w-1 shrink-0 rounded-full bg-zinc-600" />
            ) : null}
            {absoluteDateLine ? (
              <span className="truncate">{absoluteDateLine}</span>
            ) : null}
          </div>

          {summary ? (
            <div className="mt-3 line-clamp-2 text-[13px] leading-5 text-zinc-400">
              {summary}
            </div>
          ) : (
            <div className="mt-3 h-[40px]" />
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => {
              if (onPrimaryClick) {
                onPrimaryClick();
                return;
              }

              if (serviceWebUrl) {
                window.open(serviceWebUrl, "_blank", "noopener,noreferrer");
              }
            }}
            disabled={!canWatch}
            className={cn(
              "h-10 flex-1 rounded-2xl px-4 text-sm font-semibold transition",
              canWatch
                ? "bg-white text-black hover:bg-zinc-200"
                : "cursor-not-allowed bg-white/8 text-zinc-500 ring-1 ring-white/10"
            )}
          >
            {primaryLabel}
          </button>

          <button
            type="button"
            onClick={onSecondaryClick}
            disabled={!canOpenSecondary}
            className={cn(
              "h-10 rounded-2xl px-4 text-sm font-semibold transition",
              canOpenSecondary
                ? "bg-white/5 text-white ring-1 ring-white/10 hover:bg-white/10"
                : "cursor-not-allowed bg-white/4 text-zinc-600 ring-1 ring-white/8"
            )}
          >
            {secondaryLabel}
          </button>
        </div>
      </div>
    </article>
  );
}

export function CountdownTileSkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(
        "w-[278px] shrink-0 overflow-hidden rounded-[28px] bg-white/[0.045] ring-1 ring-white/10",
        className
      )}
    >
      <div className="aspect-[16/10] w-full animate-pulse bg-white/6" />
      <div className="p-4">
        <div className="h-5 w-3/4 animate-pulse rounded bg-white/8" />
        <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-white/6" />
        <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-white/5" />
        <div className="mt-3 h-10 animate-pulse rounded bg-white/5" />

        <div className="mt-4 flex gap-2">
          <div className="h-10 flex-1 animate-pulse rounded-2xl bg-white/10" />
          <div className="h-10 w-[92px] animate-pulse rounded-2xl bg-white/6" />
        </div>
      </div>
    </div>
  );
}