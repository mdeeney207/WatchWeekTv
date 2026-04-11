"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { shimmerBlurDataURL } from "@/lib/imagePlaceholders";

type PosterTileVariant = "default" | "compact" | "queue" | "featured";

type PosterTileProps = {
  tmdbId?: number | null;
  href?: string;
  title: string;
  posterUrl?: string | null;
  provider?: string | null;
  meta?: string | null;
  rightMeta?: string | null;
  nextEpisodeLabel?: string | null;
  countdownLabel?: string | null;
  primaryLabel?: string;
  secondaryLabel?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
  priority?: boolean;
  variant?: PosterTileVariant;
  className?: string;
};

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export default function PosterTile({
  tmdbId,
  href,
  title,
  posterUrl,
  provider,
  meta,
  rightMeta,
  nextEpisodeLabel,
  countdownLabel,
  primaryLabel = "View",
  secondaryLabel,
  onPrimary,
  onSecondary,
  priority = false,
  variant = "default",
  className,
}: PosterTileProps) {
  const router = useRouter();

  const isCompact = variant === "compact";
  const isQueue = variant === "queue";
  const isFeatured = variant === "featured";

  function goToDetails() {
    if (href) {
      router.push(href);
      return;
    }

    if (typeof tmdbId === "number" && Number.isFinite(tmdbId)) {
      router.push(`/tv/${tmdbId}`);
    }
  }

  const resolvedMeta = meta ?? nextEpisodeLabel ?? null;
  const showSecondary = Boolean(secondaryLabel && onSecondary);

  return (
    <div className={cn("group relative min-w-0 w-full", className)}>
      <div
        className={cn(
          "overflow-hidden rounded-[26px] bg-white/[0.045] ring-1 ring-white/10 shadow-[0_28px_80px_-42px_rgba(0,0,0,0.98)] transition duration-300",
          !isCompact &&
            "group-hover:-translate-y-1.5 group-hover:ring-white/20",
          isFeatured && "rounded-[30px]"
        )}
      >
        <button
          type="button"
          onClick={goToDetails}
          className="block w-full text-left"
        >
          <div
            className={cn(
              "relative overflow-hidden bg-white/[0.04]",
              isQueue
                ? "aspect-[2.08/3]"
                : isFeatured
                  ? "aspect-[2/3]"
                  : "aspect-[2/3]"
            )}
          >
            {posterUrl ? (
              <Image
                src={posterUrl}
                alt={title}
                fill
                priority={priority}
                unoptimized
                sizes={
                  isCompact
                    ? "(max-width: 768px) 100vw, 50vw"
                    : "(max-width: 768px) 52vw, 240px"
                }
                className={cn(
                  "object-cover transition duration-500",
                  !isCompact && "group-hover:scale-[1.05]"
                )}
                placeholder="blur"
                blurDataURL={shimmerBlurDataURL(336, 504)}
              />
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_60%)]" />
            )}

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/88 via-black/24 to-black/8" />

            {countdownLabel ? (
              <div className="absolute left-3 top-3 rounded-full bg-black/72 px-2.5 py-1 text-[11px] font-semibold text-white ring-1 ring-white/10 backdrop-blur-sm">
                {countdownLabel}
              </div>
            ) : null}

            {rightMeta ? (
              <div className="absolute right-3 top-3 rounded-full bg-white/[0.08] px-2.5 py-1 text-[11px] font-semibold text-white ring-1 ring-white/10 backdrop-blur-sm">
                {rightMeta}
              </div>
            ) : null}
          </div>
        </button>

        <div className={cn("p-4 pt-[18px]", isFeatured && "p-5")}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div
                className={cn(
                  "line-clamp-2 font-semibold text-white",
                  isFeatured ? "text-lg leading-7" : "text-[15px] leading-6"
                )}
              >
                {title}
              </div>

              <div className="mt-1.5 flex min-w-0 items-center gap-2 text-[12px] text-zinc-500">
                {provider ? <span className="truncate">{provider}</span> : null}
                {provider && resolvedMeta ? (
                  <span className="text-zinc-600">•</span>
                ) : null}
                {resolvedMeta ? (
                  <span className="truncate">{resolvedMeta}</span>
                ) : null}
              </div>
            </div>
          </div>

          {(onPrimary || showSecondary) ? (
            <div className="mt-3.5 flex gap-2">
              {onPrimary ? (
                <button
                  type="button"
                  onClick={onPrimary}
                  className={cn(
                    "h-10 rounded-2xl bg-white px-3.5 text-sm font-semibold text-black transition hover:bg-zinc-200",
                    showSecondary ? "flex-1" : "w-full"
                  )}
                >
                  {primaryLabel}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={goToDetails}
                  className={cn(
                    "h-10 rounded-2xl bg-white px-3.5 text-sm font-semibold text-black transition hover:bg-zinc-200",
                    showSecondary ? "flex-1" : "w-full"
                  )}
                >
                  {primaryLabel}
                </button>
              )}

              {showSecondary ? (
                <button
                  type="button"
                  onClick={onSecondary}
                  className="h-10 rounded-2xl bg-white/[0.06] px-3.5 text-sm font-semibold text-white ring-1 ring-white/10 transition hover:bg-white/[0.1]"
                >
                  {secondaryLabel}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}