"use client";

import Image from "next/image";
import clsx from "clsx";

type HeroArtPanelProps = {
  title: string;
  posterUrl?: string | null;
  backdropUrl?: string | null;
  className?: string;
  priority?: boolean;
};

/**
 * Production-safe hero art panel.
 *
 * PURPOSE
 * - Makes poster art the dominant focal asset in the hero stage panel
 * - Preserves a stable portrait frame
 * - Uses backdrop only as a fallback when poster art is unavailable
 *
 * FRAMING RULES
 * - Poster art gets an intentional upper-third crop so faces/upper body sit higher
 * - Backdrop fallback gets a separate focal point because landscape art behaves differently
 * - Parent controls width; this component controls crop behavior
 */
export function HeroArtPanel({
  title,
  posterUrl,
  backdropUrl,
  className,
  priority = false,
}: HeroArtPanelProps) {
  const hasPoster = Boolean(posterUrl);
  const imageUrl = posterUrl ?? backdropUrl ?? null;

  const imageClassName = hasPoster
    ? "object-cover object-[50%_10%] scale-[1.08]"
    : "object-cover object-[60%_16%] scale-[1.12]";

  return (
    <div className={clsx("relative w-full", className)}>
      <div className="relative aspect-[2/3] overflow-hidden rounded-[18px] border border-white/10 bg-white/5 shadow-[0_24px_90px_rgba(0,0,0,0.5)] ring-1 ring-white/5 backdrop-blur-sm">
        {imageUrl ? (
          <>
            <div className="absolute inset-0 overflow-hidden">
              <Image
                src={imageUrl}
                alt={`${title} artwork`}
                fill
                priority={priority}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
                className={clsx(
                  imageClassName,
                  "transition-transform duration-700 ease-out"
                )}
              />
            </div>

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/28 via-transparent to-white/[0.04]" />
            <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-white/10 via-white/5 to-transparent">
            <div className="px-6 text-center">
              <div className="mx-auto mb-3 h-12 w-12 rounded-2xl border border-white/10 bg-white/10" />
              <p className="text-sm font-medium text-white/85">{title}</p>
              <p className="mt-1 text-xs text-white/50">Artwork unavailable</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default HeroArtPanel;