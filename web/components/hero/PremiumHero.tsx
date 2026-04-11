import Link from "next/link";
import type { ReactNode } from "react";

import { HeroArtPanel } from "@/components/hero/HeroArtPanel";

type PremiumHeroChip = {
  label: string;
  tone?: "default" | "accent" | "live";
};

type PremiumHeroAction = {
  label: string;
  href: string;
  tone?: "primary" | "secondary";
};

type PremiumHeroProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  meta?: string[];
  countdownLabel?: string;
  locationLabel?: string;
  primaryAction?: PremiumHeroAction;
  secondaryAction?: PremiumHeroAction;
  chips?: PremiumHeroChip[];
  visual?: ReactNode;
  className?: string;

  /**
   * Protected hero art inputs.
   *
   * These are intentionally separate from any ambient/background backdrop
   * used by the parent page. The art panel is the stable focal media layer.
   */
  posterUrl?: string | null;
  backdropUrl?: string | null;
  artPriority?: boolean;
};

function chipClasses(tone: PremiumHeroChip["tone"] = "default") {
  if (tone === "accent") {
    return "border-emerald-400/20 bg-emerald-500/10 text-emerald-300";
  }

  if (tone === "live") {
    return "border-red-400/20 bg-red-500/10 text-red-300";
  }

  return "border-white/10 bg-white/[0.06] text-white/80";
}

function actionClasses(tone: PremiumHeroAction["tone"] = "secondary") {
  if (tone === "primary") {
    return "bg-emerald-400 text-black hover:bg-emerald-300";
  }

  return "border border-white/10 bg-white/[0.06] text-white hover:border-white/20 hover:bg-white/[0.1]";
}

export function PremiumHero({
  eyebrow,
  title,
  description,
  meta = [],
  countdownLabel,
  locationLabel,
  primaryAction,
  secondaryAction,
  chips = [],
  visual,
  className = "",
  posterUrl,
  backdropUrl,
  artPriority = false,
}: PremiumHeroProps) {
  const hasArt = Boolean(posterUrl || backdropUrl);

  return (
    <section
      className={[
        "relative overflow-hidden rounded-[28px] border border-white/10",
        "bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]",
        "shadow-2xl shadow-black/30",
        className,
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(11,15,20,0.12),rgba(11,15,20,0.34))]" />

      <div className="relative grid grid-cols-1 gap-8 p-6 sm:p-8 xl:grid-cols-[minmax(0,1.2fr)_auto] xl:items-end xl:gap-10">
        <div className="min-w-0">
          {eyebrow ? (
            <div className="mb-4 inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
              {eyebrow}
            </div>
          ) : null}

          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            {title}
          </h1>

          {description ? (
            <p className="mt-4 max-w-3xl text-base text-white/65 sm:text-lg">
              {description}
            </p>
          ) : null}

          {meta.length > 0 ? (
            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-white/78">
              {meta.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          ) : null}

          {countdownLabel || locationLabel ? (
            <div className="mt-4 space-y-2">
              {countdownLabel ? (
                <div className="text-sm font-medium text-emerald-300">
                  {countdownLabel}
                </div>
              ) : null}

              {locationLabel ? (
                <div className="text-sm text-white/55">{locationLabel}</div>
              ) : null}
            </div>
          ) : null}

          {chips.length > 0 ? (
            <div className="mt-6 flex flex-wrap gap-2">
              {chips.map((chip) => (
                <span
                  key={`${chip.label}-${chip.tone ?? "default"}`}
                  className={[
                    "rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide",
                    chipClasses(chip.tone),
                  ].join(" ")}
                >
                  {chip.label}
                </span>
              ))}
            </div>
          ) : null}

          {primaryAction || secondaryAction ? (
            <div className="mt-7 flex flex-wrap gap-3">
              {primaryAction ? (
                <Link
                  href={primaryAction.href}
                  className={[
                    "inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition",
                    actionClasses(primaryAction.tone ?? "primary"),
                  ].join(" ")}
                >
                  {primaryAction.label}
                </Link>
              ) : null}

              {secondaryAction ? (
                <Link
                  href={secondaryAction.href}
                  className={[
                    "inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition",
                    actionClasses(secondaryAction.tone ?? "secondary"),
                  ].join(" ")}
                >
                  {secondaryAction.label}
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-end">
          {hasArt ? (
            <HeroArtPanel
              title={title}
              posterUrl={posterUrl}
              backdropUrl={backdropUrl}
              priority={artPriority}
              className="mx-auto xl:mx-0"
            />
          ) : null}

          {visual ? (
            <div className="w-full xl:w-[320px] 2xl:w-[340px]">
              <div className="flex min-h-[260px] flex-col justify-between rounded-[24px] border border-white/10 bg-black/20 p-5 shadow-xl shadow-black/20 backdrop-blur-sm">
                {visual}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}