"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { HeroArtPanel } from "@/components/hero/HeroArtPanel";
import { shimmerBlurDataURL } from "@/lib/imagePlaceholders";
import type { CandidateCardModel } from "./types";
import { formatDowMonthDay, formatTime, hoursFromNowLabel } from "./utils";
import { toProviderKey } from "@/lib/home/selectHero";

// ─── Global keyframes ──────────────────────────────────────────────────────────

export const KEYFRAMES = `
@keyframes ww-fade-up {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes ww-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes ww-scale-in {
  from { opacity: 0; transform: scale(0.97); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes ww-glow-pulse {
  0%, 100% { opacity: 0.5; }
  50%      { opacity: 0.9; }
}
@keyframes ww-count-up {
  from { opacity: 0; transform: translateY(8px) scale(0.92); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
`;

let keyframesInjected = false;
export function ensureKeyframes() {
  if (typeof document === "undefined" || keyframesInjected) return;
  const style = document.createElement("style");
  style.textContent = KEYFRAMES;
  document.head.appendChild(style);
  keyframesInjected = true;
}

function useAnimateIn(delay = 0, animation = "ww-fade-up") {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    ensureKeyframes();
    const el = ref.current;
    if (!el) return;

    el.style.animationFillMode = "both";
    el.style.animationDuration = "0.55s";
    el.style.animationTimingFunction = "cubic-bezier(0.22,1,0.36,1)";
    el.style.animationName = animation;
    el.style.animationDelay = `${delay}ms`;
  }, [delay, animation]);

  return ref;
}

// ─── Provider pill ─────────────────────────────────────────────────────────────

const PROVIDER_ACCENTS: Record<
  string,
  { bg: string; color: string; border: string }
> = {
  Netflix: {
    bg: "rgba(229,9,20,0.10)",
    color: "rgba(255,255,255,0.92)",
    border: "rgba(229,9,20,0.22)",
  },
  Hulu: {
    bg: "rgba(28,231,131,0.10)",
    color: "rgba(255,255,255,0.92)",
    border: "rgba(28,231,131,0.22)",
  },
  Max: {
    bg: "rgba(60,120,255,0.10)",
    color: "rgba(255,255,255,0.92)",
    border: "rgba(60,120,255,0.22)",
  },
  "Prime Video": {
    bg: "rgba(0,168,225,0.10)",
    color: "rgba(255,255,255,0.92)",
    border: "rgba(0,168,225,0.22)",
  },
  "Disney+": {
    bg: "rgba(30,80,220,0.10)",
    color: "rgba(255,255,255,0.92)",
    border: "rgba(30,80,220,0.22)",
  },
  "Apple TV+": {
    bg: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.92)",
    border: "rgba(255,255,255,0.18)",
  },
  Peacock: {
    bg: "rgba(255,190,0,0.10)",
    color: "rgba(255,255,255,0.92)",
    border: "rgba(255,190,0,0.22)",
  },
  "Paramount+": {
    bg: "rgba(0,112,255,0.10)",
    color: "rgba(255,255,255,0.92)",
    border: "rgba(0,112,255,0.22)",
  },
  Streaming: {
    bg: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.90)",
    border: "rgba(255,255,255,0.16)",
  },
  Tracked: {
    bg: "rgba(255,255,255,0.05)",
    color: "rgba(255,255,255,0.82)",
    border: "rgba(255,255,255,0.14)",
  },
  Trending: {
    bg: "rgba(52,211,153,0.10)",
    color: "rgba(255,255,255,0.92)",
    border: "rgba(52,211,153,0.20)",
  },
  Unknown: {
    bg: "rgba(255,255,255,0.05)",
    color: "rgba(255,255,255,0.82)",
    border: "rgba(255,255,255,0.14)",
  },
};

export function ProviderPill({ name }: { name: string }) {
  const normalized = toProviderKey(name);
  const displayLabel =
    normalized !== "Unknown"
      ? normalized
      : String(name ?? "")
          .replace(/[$€£¥#@!%^&*]/g, "")
          .trim()
          .replace(/^[^a-zA-Z]+/, "")
          .trim() || "Tracked";

  const a = PROVIDER_ACCENTS[displayLabel] ?? PROVIDER_ACCENTS.Tracked;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: "999px",
        padding: "4px 10px",
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        background: a.bg,
        color: a.color,
        border: `1px solid ${a.border}`,
        whiteSpace: "nowrap",
        lineHeight: "1.4",
        backdropFilter: "blur(10px)",
      }}
    >
      {displayLabel}
    </span>
  );
}

// ─── Modal ─────────────────────────────────────────────────────────────────────

export function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(18px)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {children}
    </div>
  );
}

// ─── Shared tiny bits ──────────────────────────────────────────────────────────

function LiveDot({ color = "emerald" }: { color?: "emerald" | "amber" }) {
  const isAmber = color === "amber";

  return (
    <span className="relative inline-flex h-2 w-2 shrink-0">
      <span
        className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-50"
        style={{ background: isAmber ? "#fbbf24" : "#34d399" }}
      />
      <span
        className="relative inline-flex h-2 w-2 rounded-full"
        style={{
          background: isAmber ? "#fbbf24" : "#34d399",
          boxShadow: isAmber
            ? "0 0 8px rgba(251,191,36,0.55)"
            : "0 0 8px rgba(52,211,153,0.55)",
        }}
      />
    </span>
  );
}

function UrgencyChip({ label, live }: { label: string; live?: boolean }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold"
      style={{
        background: live
          ? "rgba(251,191,36,0.10)"
          : "rgba(52,211,153,0.10)",
        color: live ? "#fcd34d" : "#86efac",
        border: live
          ? "1px solid rgba(251,191,36,0.18)"
          : "1px solid rgba(52,211,153,0.18)",
        backdropFilter: "blur(10px)",
      }}
    >
      {label}
    </span>
  );
}

// ─── Section header ────────────────────────────────────────────────────────────

export function SectionHeader({
  title,
  subtitle,
  eyebrow,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
}) {
  const ref = useAnimateIn(0, "ww-fade-up");

  return (
    <div ref={ref}>
      <div className="flex items-center gap-2.5">
        <span
          className="inline-flex h-[5px] w-[5px] rounded-full"
          style={{
            background: "#34d399",
            boxShadow: "0 0 6px rgba(52,211,153,0.55)",
          }}
        />
        <div
          className="h-px w-5 rounded-full"
          style={{
            background:
              "linear-gradient(90deg, rgba(52,211,153,0.55), rgba(255,255,255,0.10))",
          }}
        />
        <span
          className="text-[9px] font-bold uppercase tracking-[0.34em]"
          style={{ color: "rgba(255,255,255,0.42)" }}
        >
          {eyebrow ?? "Featured"}
        </span>
      </div>

      <h2
        className="mt-3 font-black leading-[1.0] tracking-[-0.05em] text-white"
        style={{ fontSize: "clamp(22px, 2.4vw, 32px)" }}
      >
        {title}
      </h2>

      {subtitle ? (
        <p
          className="mt-2 text-[14px] leading-relaxed"
          style={{ color: "rgba(255,255,255,0.56)" }}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

// ─── Hero stage panel ──────────────────────────────────────────────────────────

export function HeroStagePanel({
  title,
  posterUrl,
  backdropUrl,
  provider,
  when,
  urgency,
  supportLabel,
  onPrimary,
  onSecondary,
}: {
  title: string;
  posterUrl?: string | null;
  backdropUrl?: string | null;
  provider: string;
  when: string;
  urgency: string;
  supportLabel: string;
  onPrimary: () => void;
  onSecondary: () => void;
}) {
  const isLive = urgency === "Now";

  return (
    <div
      className="relative overflow-hidden rounded-[24px]"
      style={{
        marginTop: "4px",
        background:
          "linear-gradient(180deg, rgba(18,18,18,0.96) 0%, rgba(12,12,12,0.96) 100%)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow:
          "0 28px 72px -34px rgba(0,0,0,0.96), inset 0 1px 0 rgba(255,255,255,0.05)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 8%, rgba(255,255,255,0.18) 34%, rgba(255,255,255,0.18) 66%, transparent 92%)",
        }}
      />

      <div className="relative px-[12px] pb-[16px] pt-[11px]">
        <HeroArtPanel
          title={title}
          posterUrl={posterUrl ?? null}
          backdropUrl={backdropUrl ?? null}
          priority
          className="w-full"
        />

        <div className="mt-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <LiveDot color={isLive ? "amber" : "emerald"} />
              <span
                className="truncate text-[8px] font-bold uppercase tracking-[0.30em]"
                style={{ color: "rgba(255,255,255,0.68)" }}
              >
                {supportLabel}
              </span>
            </div>
            <UrgencyChip label={urgency} live={isLive} />
          </div>

          <div>
            <div className="line-clamp-2 text-[18px] font-black leading-[1.05] tracking-[-0.04em] text-white">
              {title}
            </div>

            <div className="mt-1.5 flex flex-col gap-1 text-[11px]">
              <div className="w-fit">
                <ProviderPill name={provider} />
              </div>
              <span
                className="text-[11px] font-medium leading-[1.35]"
                style={{ color: "rgba(255,255,255,0.72)" }}
              >
                {when}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1.5">
            <button
              onClick={onPrimary}
              className="h-9 flex-1 rounded-[13px] text-[12px] font-black text-black transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: "linear-gradient(180deg, #ffffff 0%, #dedede 100%)",
                boxShadow:
                  "0 10px 24px -14px rgba(255,255,255,0.42), 0 1px 4px rgba(255,255,255,0.08)",
              }}
            >
              Open show
            </button>

            <button
              onClick={onSecondary}
              className="h-9 rounded-[13px] px-3 text-[12px] font-medium transition-all duration-150 hover:bg-white/[0.08]"
              style={{
                color: "rgba(255,255,255,0.90)",
                border: "1px solid rgba(255,255,255,0.16)",
                background: "rgba(255,255,255,0.06)",
                backdropFilter: "blur(10px)",
              }}
            >
              Calendar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Queue peek strip ──────────────────────────────────────────────────────────

function QueuePeekItem({
  item,
  onOpen,
}: {
  item: CandidateCardModel;
  onOpen: (id: string) => void;
}) {
  return (
    <button
      onClick={() => onOpen(item.id)}
      className="group flex min-w-0 items-center gap-3 rounded-[14px] px-3 py-3 text-left transition-all duration-200 hover:bg-white/[0.04]"
    >
      <div
        className="relative h-[56px] w-[40px] shrink-0 overflow-hidden rounded-[10px]"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        {item.posterUrl ? (
          <Image
            src={item.posterUrl}
            alt={item.title}
            fill
            sizes="40px"
            quality={72}
            unoptimized
            placeholder="blur"
            blurDataURL={shimmerBlurDataURL(100, 150)}
            className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
          />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold text-white">
          {item.title}
        </div>
        <div
          className="mt-0.5 truncate text-[12px]"
          style={{ color: "rgba(255,255,255,0.62)" }}
        >
          {item.date
            ? `${formatDowMonthDay(item.date)} · ${formatTime(item.date)}`
            : "Release time TBD"}
        </div>
      </div>

      {item.date ? <UrgencyChip label={hoursFromNowLabel(item.date)} /> : null}
    </button>
  );
}

export function QueuePeekStrip({
  items,
  onOpen,
  onOpenCalendar,
}: {
  items: CandidateCardModel[];
  onOpen: (id: string) => void;
  onOpenCalendar: () => void;
}) {
  const stripRef = useAnimateIn(0, "ww-fade-up");
  if (!items.length) return null;

  return (
    <section
      ref={stripRef}
      className="relative overflow-hidden rounded-[22px] p-4"
      style={{
        background:
          "linear-gradient(180deg, rgba(16,16,16,0.98) 0%, rgba(11,11,11,0.98) 100%)",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow:
          "0 24px 60px -34px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      <div
        className="pointer-events-none absolute left-0 top-0 h-px w-2/3"
        style={{
          background:
            "linear-gradient(90deg, rgba(52,211,153,0.42), rgba(255,255,255,0.10), transparent)",
        }}
      />

      <div className="relative flex items-center justify-between gap-2 px-1 pb-1">
        <div className="flex items-center gap-2">
          <LiveDot />
          <span
            className="text-[9px] font-bold uppercase tracking-[0.34em]"
            style={{ color: "rgba(255,255,255,0.42)" }}
          >
            Up next in your queue
          </span>
        </div>
        <button
          onClick={onOpenCalendar}
          className="text-[11px] font-medium transition hover:text-white"
          style={{ color: "rgba(255,255,255,0.54)" }}
        >
          Full calendar →
        </button>
      </div>

      <div className="relative mt-1 space-y-0.5">
        {items.map((item) => (
          <QueuePeekItem
            key={`queue-peek-${item.id}-${item.date?.toISOString() ?? "none"}`}
            item={item}
            onOpen={onOpen}
          />
        ))}
      </div>
    </section>
  );
}

// ─── Home poster tile ──────────────────────────────────────────────────────────

export function HomePosterTile({
  title,
  img,
  provider,
  meta,
  rightMeta,
  primaryLabel,
  secondaryLabel,
  badgeProviders,
  onPrimary,
  onSecondary,
}: {
  title: string;
  img?: string;
  provider: string;
  meta?: string;
  rightMeta?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  badgeProviders?: string[];
  onPrimary?: () => void;
  onSecondary?: () => void;
}) {
  return (
    <div className="group w-[160px] shrink-0 sm:w-[168px] lg:w-[176px]">
      <div
        className="relative aspect-[2/3] overflow-hidden rounded-[18px] transition-all duration-300 group-hover:-translate-y-1.5"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 18px 40px -22px rgba(0,0,0,0.92)",
        }}
      >
        {img ? (
          <Image
            src={img}
            alt={title}
            fill
            sizes="176px"
            quality={78}
            unoptimized
            placeholder="blur"
            blurDataURL={shimmerBlurDataURL(320, 480)}
            className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="relative flex h-full w-full items-end p-3.5">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] to-transparent" />
            <div className="relative line-clamp-3 text-[13px] font-medium leading-snug text-white/75">
              {title}
            </div>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/78 to-transparent" />

        {badgeProviders?.length ? (
          <div className="absolute left-2.5 top-2.5 z-10 flex flex-wrap gap-1">
            {badgeProviders.map((p) => (
              <span key={p} className="origin-top-left scale-[0.90]">
                <ProviderPill name={p} />
              </span>
            ))}
          </div>
        ) : null}

        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 44%)",
          }}
        />
      </div>

      <div className="mt-2.5">
        <div className="truncate text-[14px] font-semibold leading-tight text-white">
          {title}
        </div>

        <div className="mt-0.5 flex items-center justify-between gap-2">
          <span
            className="truncate text-[12px]"
            style={{ color: "rgba(255,255,255,0.62)" }}
          >
            {provider}
          </span>
          {rightMeta ? (
            <span
              className="shrink-0 text-[11px] font-semibold"
              style={{ color: "rgba(255,255,255,0.84)" }}
            >
              {rightMeta}
            </span>
          ) : null}
        </div>

        {meta ? (
          <div
            className="mt-0.5 truncate text-[11px]"
            style={{ color: "rgba(255,255,255,0.56)" }}
          >
            {meta}
          </div>
        ) : null}

        {onPrimary || onSecondary ? (
          <div className="mt-2.5 flex gap-1.5">
            {onPrimary && primaryLabel ? (
              <button
                onClick={onPrimary}
                className="h-8 flex-1 rounded-[12px] text-[12px] font-semibold text-black transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: "linear-gradient(180deg, #fff 0%, #dfdfdf 100%)",
                  boxShadow: "0 8px 18px -12px rgba(255,255,255,0.32)",
                }}
              >
                {primaryLabel}
              </button>
            ) : null}
            {onSecondary && secondaryLabel ? (
              <button
                onClick={onSecondary}
                className="h-8 rounded-[12px] px-3 text-[12px] font-medium transition-all hover:bg-white/[0.08]"
                style={{
                  color: "rgba(255,255,255,0.88)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.05)",
                }}
              >
                {secondaryLabel}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── Trending poster shelf ─────────────────────────────────────────────────────

function TrendingShelfCard({
  title,
  img,
  onOpen,
}: {
  title: string;
  img?: string;
  onOpen: () => void;
}) {
  return (
    <article className="group relative w-[166px] shrink-0 sm:w-[174px] lg:w-[182px] xl:w-[192px]">
      <button onClick={onOpen} className="block w-full text-left">
        <div
          className="relative aspect-[2/3] overflow-hidden rounded-[18px] transition-all duration-300 group-hover:-translate-y-1.5"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 22px 46px -24px rgba(0,0,0,0.96)",
          }}
        >
          {img ? (
            <Image
              src={img}
              alt={title}
              fill
              sizes="192px"
              quality={80}
              unoptimized
              placeholder="blur"
              blurDataURL={shimmerBlurDataURL(320, 480)}
              className="object-cover transition-transform duration-700 group-hover:scale-[1.05]"
            />
          ) : (
            <div className="flex h-full items-end p-4">
              <div className="line-clamp-3 text-[14px] font-medium leading-snug text-white/[0.82]">
                {title}
              </div>
            </div>
          )}

          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.03) 0%, rgba(0,0,0,0.08) 40%, rgba(0,0,0,0.74) 100%)",
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 42%)",
            }}
          />

          <div className="absolute left-2.5 top-2.5">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.20em]"
              style={{
                background: "rgba(8,8,8,0.58)",
                color: "rgba(255,255,255,0.88)",
                border: "1px solid rgba(255,255,255,0.12)",
                backdropFilter: "blur(12px)",
              }}
            >
              <span
                className="inline-flex h-1.5 w-1.5 rounded-full"
                style={{
                  background: "#34d399",
                  boxShadow: "0 0 4px rgba(52,211,153,0.8)",
                }}
              />
              Trending
            </span>
          </div>
        </div>

        <div className="mt-3 px-0.5">
          <div className="truncate text-[14px] font-semibold leading-tight tracking-[-0.02em] text-white">
            {title}
          </div>
          <div
            className="mt-1 flex items-center justify-between gap-3"
            style={{ color: "rgba(255,255,255,0.58)" }}
          >
            <span className="truncate text-[10px] font-medium uppercase tracking-[0.16em]">
              Popular now
            </span>
            <span className="text-[11px] font-semibold text-white/64 transition-colors duration-200 group-hover:text-emerald-300">
              →
            </span>
          </div>
        </div>
      </button>
    </article>
  );
}

function ShelfArrow({
  direction,
  onClick,
  disabled,
}: {
  direction: "left" | "right";
  onClick: () => void;
  disabled: boolean;
}) {
  const isLeft = direction === "left";

  return (
    <button
      type="button"
      aria-label={isLeft ? "Scroll left" : "Scroll right"}
      onClick={onClick}
      disabled={disabled}
      className={[
        "hidden md:flex absolute top-[calc(50%-22px)] z-30 h-11 w-11 items-center justify-center rounded-full transition-all duration-200",
        isLeft ? "left-3 lg:left-4" : "right-3 lg:right-4",
        disabled
          ? "cursor-default opacity-25"
          : "hover:scale-[1.04] active:scale-[0.98]",
      ].join(" ")}
      style={{
        background: disabled ? "rgba(10,10,10,0.22)" : "rgba(8,8,8,0.84)",
        border: "1px solid rgba(255,255,255,0.14)",
        boxShadow: disabled ? "none" : "0 14px 30px -18px rgba(0,0,0,1)",
        backdropFilter: "blur(16px)",
      }}
    >
      <span
        className="text-lg font-semibold leading-none"
        style={{
          color: disabled ? "rgba(255,255,255,0.34)" : "rgba(255,255,255,0.90)",
        }}
      >
        {isLeft ? "‹" : "›"}
      </span>
    </button>
  );
}

export function TrendingPosterShelf({
  items,
  onOpen,
  onViewAll,
}: {
  items: Array<{
    id: string;
    title: string;
    posterUrl?: string;
  }>;
  onOpen: (id: string) => void;
  onViewAll: () => void;
}) {
  const railRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    isPointerDown: boolean;
    startX: number;
    startScrollLeft: number;
    moved: boolean;
  }>({
    isPointerDown: false,
    startX: 0,
    startScrollLeft: 0,
    moved: false,
  });

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const updateScrollState = () => {
      const maxScrollLeft = Math.max(rail.scrollWidth - rail.clientWidth, 0);
      setCanScrollLeft(rail.scrollLeft > 8);
      setCanScrollRight(rail.scrollLeft < maxScrollLeft - 8);
    };

    updateScrollState();
    rail.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      rail.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [items.length]);

  if (!items.length) return null;

  const getScrollStep = () => {
    if (typeof window === "undefined") return 720;
    if (window.innerWidth >= 1536) return 940;
    if (window.innerWidth >= 1280) return 840;
    if (window.innerWidth >= 1024) return 720;
    if (window.innerWidth >= 768) return 560;
    return 320;
  };

  const scrollByAmount = (delta: number) => {
    railRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const rail = railRef.current;
    if (!rail) return;

    dragStateRef.current = {
      isPointerDown: true,
      startX: e.clientX,
      startScrollLeft: rail.scrollLeft,
      moved: false,
    };
    setIsDragging(false);
    rail.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rail = railRef.current;
    const state = dragStateRef.current;
    if (!rail || !state.isPointerDown) return;

    const deltaX = e.clientX - state.startX;

    if (!state.moved && Math.abs(deltaX) > 6) {
      state.moved = true;
      setIsDragging(true);
    }

    if (state.moved) {
      rail.scrollLeft = state.startScrollLeft - deltaX;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const rail = railRef.current;
    dragStateRef.current.isPointerDown = false;
    if (rail) rail.releasePointerCapture?.(e.pointerId);
    window.setTimeout(() => setIsDragging(false), 0);
  };

  const desktopHint = items.length > 4 ? "Drag or use arrows" : "Browse";

  return (
    <div
      className="group relative overflow-hidden rounded-[26px] p-5 md:p-6"
      style={{
        background:
          "linear-gradient(180deg, rgba(14,14,14,0.99) 0%, rgba(10,10,10,0.99) 100%)",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow:
          "0 26px 68px -40px rgba(0,0,0,0.95), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      <div
        className="pointer-events-none absolute left-0 top-0 h-px w-full"
        style={{
          background:
            "linear-gradient(90deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.12) 16%, rgba(255,255,255,0.04) 40%, transparent 72%)",
        }}
      />

      <div className="relative z-20 flex items-start justify-between gap-4 px-1 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span
              className="inline-flex h-1.5 w-1.5 rounded-full"
              style={{
                background: "rgba(52,211,153,0.9)",
                boxShadow: "0 0 6px rgba(52,211,153,0.65)",
              }}
            />
            <div
              className="h-px w-5 rounded-full"
              style={{
                background:
                  "linear-gradient(90deg, rgba(52,211,153,0.52), rgba(255,255,255,0.10))",
              }}
            />
            <span
              className="text-[9px] font-bold uppercase tracking-[0.34em]"
              style={{ color: "rgba(255,255,255,0.40)" }}
            >
              Browse now
            </span>
          </div>

          <h2
            className="mt-3 font-black leading-[1.0] tracking-[-0.05em] text-white"
            style={{ fontSize: "clamp(24px, 2.6vw, 34px)" }}
          >
            Trending Tonight
          </h2>

          <p
            className="mt-1.5 text-[14px] leading-relaxed"
            style={{ color: "rgba(255,255,255,0.58)" }}
          >
            The most-watched shows right now, updated daily.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2.5 pt-0.5">
          <span
            className="hidden rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] lg:inline-flex"
            style={{ color: "rgba(255,255,255,0.48)" }}
          >
            {desktopHint}
          </span>

          <button
            onClick={onViewAll}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.12] bg-white/[0.05] px-3.5 py-1.5 text-[13px] font-medium transition hover:bg-white/[0.08] hover:text-white"
            style={{ color: "rgba(255,255,255,0.82)" }}
          >
            <span>View all</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>

      <div className="relative z-20 px-1">
        <div className="relative overflow-hidden rounded-[22px]">
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-20 w-6 md:w-10"
            style={{
              background:
                "linear-gradient(90deg, rgba(8,8,10,0.58) 0%, rgba(8,8,10,0.22) 55%, transparent 100%)",
            }}
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-20 w-6 md:w-10"
            style={{
              background:
                "linear-gradient(270deg, rgba(8,8,10,0.58) 0%, rgba(8,8,10,0.22) 55%, transparent 100%)",
            }}
          />

          <ShelfArrow
            direction="left"
            onClick={() => scrollByAmount(-getScrollStep())}
            disabled={!canScrollLeft}
          />
          <ShelfArrow
            direction="right"
            onClick={() => scrollByAmount(getScrollStep())}
            disabled={!canScrollRight}
          />

          <div
            ref={railRef}
            className={[
              "overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden select-none",
              isDragging ? "cursor-grabbing" : "cursor-grab",
            ].join(" ")}
            style={{
              WebkitOverflowScrolling: "touch",
              paddingTop: "6px",
              paddingBottom: "2px",
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={(e) => {
              if (dragStateRef.current.isPointerDown) handlePointerUp(e);
            }}
          >
            <div className="flex w-max snap-x snap-mandatory gap-4 pr-16 md:gap-5 md:pr-20">
              {items.map((item) => (
                <div key={`trending-shelf-${item.id}`} className="snap-start">
                  <TrendingShelfCard
                    title={item.title}
                    img={item.posterUrl}
                    onOpen={() => onOpen(item.id)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-20 mt-4 flex items-center justify-end gap-2 px-1 md:hidden">
        <button
          type="button"
          aria-label="Scroll left"
          onClick={() => scrollByAmount(-getScrollStep())}
          disabled={!canScrollLeft}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.05] text-white/80 disabled:opacity-30"
        >
          ‹
        </button>
        <button
          type="button"
          aria-label="Scroll right"
          onClick={() => scrollByAmount(getScrollStep())}
          disabled={!canScrollRight}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.05] text-white/80 disabled:opacity-30"
        >
          ›
        </button>
      </div>
    </div>
  );
}

// ─── Release strip card ────────────────────────────────────────────────────────

export function ReleaseStripCard({
  label,
  count,
  title,
  detail,
  chip,
  provider,
  onClick,
  actionLabel,
}: {
  label: string;
  count: number;
  title: string;
  detail: string;
  chip?: string;
  provider?: string;
  onClick: () => void;
  actionLabel: string;
}) {
  const hasContent = count > 0;
  const ref = useAnimateIn(0, "ww-fade-up");

  return (
    <div
      ref={ref}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className="group relative cursor-pointer overflow-hidden rounded-[22px] transition-all duration-300 hover:-translate-y-1.5"
      style={{
        background:
          "linear-gradient(155deg, rgba(20,20,20,0.98) 0%, rgba(12,12,12,0.98) 100%)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow:
          "0 22px 54px -28px rgba(0,0,0,0.94), inset 0 1px 0 rgba(255,255,255,0.04)",
        minHeight: "152px",
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.16) 22%, rgba(255,255,255,0.16) 78%, transparent)",
        }}
      />

      <div className="relative flex h-full flex-col justify-between p-5">
        <div className="flex items-start justify-between gap-2">
          <span
            className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.26em]"
            style={{ color: "rgba(255,255,255,0.58)" }}
          >
            {label}
          </span>

          <span
            className="font-black tabular-nums leading-none"
            style={{
              fontSize: "clamp(30px, 3vw, 40px)",
              color: hasContent ? "#86efac" : "rgba(255,255,255,0.42)",
              animation: hasContent
                ? "ww-count-up 0.45s cubic-bezier(0.34,1.56,0.64,1) both"
                : "none",
              letterSpacing: "-0.04em",
            }}
          >
            {count}
          </span>
        </div>

        <div>
          {chip ? (
            <div className="mb-2">
              <UrgencyChip label={chip} />
            </div>
          ) : null}

          <div
            className="line-clamp-1 font-semibold leading-tight tracking-[-0.03em]"
            style={{ fontSize: "clamp(15px, 1.4vw, 18px)", color: "#ffffff" }}
          >
            {title}
          </div>

          {provider ? (
            <div className="mt-2">
              <ProviderPill name={provider} />
            </div>
          ) : (
            <div
              className="mt-1.5 line-clamp-2 text-[12px] leading-[1.55]"
              style={{ color: "rgba(255,255,255,0.58)" }}
            >
              {detail}
            </div>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="mt-3 h-9 w-full rounded-[11px] text-[13px] font-semibold transition-all hover:scale-[1.01] active:scale-[0.98]"
            style={{
              background: hasContent
                ? "linear-gradient(180deg, #ffffff 0%, #e1e1e1 100%)"
                : "rgba(255,255,255,0.06)",
              color: hasContent ? "#000" : "#ffffff",
              border: hasContent ? "none" : "1px solid rgba(255,255,255,0.14)",
              boxShadow: hasContent
                ? "0 8px 18px -12px rgba(255,255,255,0.30)"
                : "none",
            }}
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Quick tools card ──────────────────────────────────────────────────────────

export function QuickToolsCard({
  title,
  detail,
  chip,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
}: {
  title: string;
  detail: string;
  chip?: string;
  primaryLabel: string;
  secondaryLabel: string;
  onPrimary: () => void;
  onSecondary: () => void;
}) {
  const ref = useAnimateIn(0, "ww-fade-up");

  return (
    <div
      ref={ref}
      className="group relative overflow-hidden rounded-[22px] p-5 transition-all duration-300 hover:-translate-y-1.5"
      style={{
        background:
          "linear-gradient(155deg, rgba(18,19,18,0.98) 0%, rgba(12,13,12,0.98) 100%)",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow:
          "0 22px 54px -30px rgba(0,0,0,0.94), inset 0 1px 0 rgba(255,255,255,0.04)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.14) 30%, rgba(255,255,255,0.14) 70%, transparent)",
        }}
      />

      <div className="relative flex items-start justify-between gap-2">
        <span
          className="text-[9px] font-bold uppercase tracking-[0.34em]"
          style={{ color: "rgba(255,255,255,0.46)" }}
        >
          Next action
        </span>
        {chip ? <UrgencyChip label={chip} /> : null}
      </div>

      <div
        className="relative mt-2.5 line-clamp-2 font-semibold leading-[1.02] tracking-[-0.04em]"
        style={{ fontSize: "clamp(18px, 1.6vw, 22px)", color: "#ffffff" }}
      >
        {title}
      </div>

      <div
        className="relative mt-2 line-clamp-2 text-[12px] leading-[1.6]"
        style={{ color: "rgba(255,255,255,0.58)" }}
      >
        {detail}
      </div>

      <div className="relative mt-4 flex gap-1.5">
        <button
          onClick={onPrimary}
          className="h-8 flex-1 rounded-[12px] text-[12px] font-semibold text-black transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: "linear-gradient(180deg, #ffffff 0%, #dfdfdf 100%)",
            boxShadow: "0 8px 16px -12px rgba(255,255,255,0.28)",
          }}
        >
          {primaryLabel}
        </button>
        <button
          onClick={onSecondary}
          className="h-8 rounded-[12px] px-3 text-[12px] font-medium transition-all hover:bg-white/[0.08]"
          style={{
            color: "rgba(255,255,255,0.88)",
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.05)",
          }}
        >
          {secondaryLabel}
        </button>
      </div>
    </div>
  );
}

// ─── Compact utility card ──────────────────────────────────────────────────────

export function CompactUtilityCard({
  eyebrow,
  title,
  detail,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
}: {
  eyebrow: string;
  title: string;
  detail: string;
  primaryLabel: string;
  secondaryLabel: string;
  onPrimary: () => void;
  onSecondary: () => void;
}) {
  const ref = useAnimateIn(0, "ww-fade-up");

  return (
    <section
      ref={ref}
      className="group relative overflow-hidden rounded-[22px] p-6 transition-all duration-300 hover:-translate-y-1"
      style={{
        background:
          "linear-gradient(155deg, rgba(20,20,20,0.98) 0%, rgba(14,14,14,0.98) 100%)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow:
          "0 22px 56px -30px rgba(0,0,0,0.96), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.16) 28%, rgba(255,255,255,0.16) 72%, transparent)",
        }}
      />

      <span
        className="text-[9px] font-bold uppercase tracking-[0.34em]"
        style={{ color: "rgba(255,255,255,0.46)" }}
      >
        {eyebrow}
      </span>

      <h3 className="mt-2.5 text-[19px] font-semibold leading-snug tracking-[-0.03em] text-white">
        {title}
      </h3>

      <p
        className="mt-2 text-[13px] leading-[1.65]"
        style={{ color: "rgba(255,255,255,0.60)" }}
      >
        {detail}
      </p>

      <div className="mt-5 flex gap-2.5">
        <button
          onClick={onPrimary}
          className="h-10 rounded-[13px] px-6 text-[13px] font-semibold text-black transition-all hover:scale-[1.01] active:scale-[0.98]"
          style={{
            background: "linear-gradient(180deg, #ffffff 0%, #e2e2e2 100%)",
            boxShadow: "0 10px 22px -14px rgba(255,255,255,0.30)",
          }}
        >
          {primaryLabel}
        </button>

        <button
          onClick={onSecondary}
          className="h-10 rounded-[13px] px-6 text-[13px] font-medium transition-all hover:bg-white/[0.08]"
          style={{
            color: "rgba(255,255,255,0.88)",
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.05)",
          }}
        >
          {secondaryLabel}
        </button>
      </div>
    </section>
  );
}

// ─── Featured drop tonight (single-item) ──────────────────────────────────────

export function FeaturedDropTonightCompact({
  item,
  onPrimary,
  onSecondary,
  onRemove,
}: {
  item: CandidateCardModel;
  onPrimary: () => void;
  onSecondary: () => void;
  onRemove?: () => void;
}) {
  const background = item.backdropUrl ?? item.posterUrl ?? undefined;
  const when = item.date
    ? `${formatDowMonthDay(item.date)} · ${formatTime(item.date)}`
    : "Release time TBD";
  const ref = useAnimateIn(0, "ww-scale-in");

  return (
    <div
      ref={ref}
      className="group relative overflow-hidden rounded-[26px]"
      style={{
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow:
          "0 34px 84px -38px rgba(0,0,0,0.98), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      {background ? (
        <div className="absolute inset-0 z-0">
          <Image
            src={background}
            alt=""
            fill
            sizes="100vw"
            quality={88}
            unoptimized
            placeholder="blur"
            blurDataURL={shimmerBlurDataURL(1400, 800)}
            className="object-cover object-center opacity-[0.34] transition-all duration-700 group-hover:scale-[1.02] group-hover:opacity-[0.40]"
          />
        </div>
      ) : null}

      <div
        className="absolute inset-0 z-10"
        style={{
          background:
            "linear-gradient(112deg, rgba(0,0,0,0.96) 0%, rgba(0,0,0,0.88) 36%, rgba(0,0,0,0.70) 100%)",
        }}
      />

      <div className="relative z-20 grid gap-5 p-5 xl:grid-cols-[132px_minmax(0,1fr)] xl:items-center">
        <div
          className="relative h-[192px] w-[132px] overflow-hidden rounded-[18px] shadow-[0_22px_54px_-20px_rgba(0,0,0,0.96)] transition-transform duration-500 group-hover:scale-[1.02]"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          {item.posterUrl ? (
            <Image
              src={item.posterUrl}
              alt={item.title}
              fill
              sizes="132px"
              quality={84}
              unoptimized
              placeholder="blur"
              blurDataURL={shimmerBlurDataURL(264, 396)}
              className="object-cover"
            />
          ) : null}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[9px] font-bold uppercase tracking-[0.24em]"
              style={{
                background: "rgba(52,211,153,0.10)",
                color: "#86efac",
                border: "1px solid rgba(52,211,153,0.18)",
              }}
            >
              <LiveDot />
              Featured tonight
            </span>
            <ProviderPill name={item.provider} />
            {item.date ? (
              <span
                className="rounded-full px-2.5 py-0.5 text-[10px] font-medium"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  color: "rgba(255,255,255,0.74)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                {hoursFromNowLabel(item.date)}
              </span>
            ) : null}
          </div>

          <h3
            className="mt-3 font-black leading-[0.92] tracking-[-0.05em] text-white"
            style={{
              fontSize: "clamp(1.9rem, 4vw, 2.7rem)",
              textShadow: "0 2px 20px rgba(0,0,0,0.44)",
            }}
          >
            {item.title}
          </h3>

          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[13px]">
            <span style={{ color: "rgba(255,255,255,0.80)" }}>{when}</span>
            {item.candidate.relationship === "followed" ? (
              <>
                <span style={{ color: "rgba(255,255,255,0.26)" }}>·</span>
                <span style={{ color: "rgba(255,255,255,0.54)" }}>
                  Because you follow it
                </span>
              </>
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap gap-2.5">
            <button
              onClick={onPrimary}
              className="h-11 rounded-[15px] px-7 text-[14px] font-semibold text-black transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: "linear-gradient(180deg, #fff 0%, #e4e4e4 100%)",
                boxShadow:
                  "0 12px 28px -18px rgba(255,255,255,0.34), 0 1px 4px rgba(255,255,255,0.10)",
              }}
            >
              Open show
            </button>

            <button
              onClick={onSecondary}
              className="h-11 rounded-[15px] px-5 text-[14px] font-medium transition-all hover:bg-white/[0.08]"
              style={{
                color: "rgba(255,255,255,0.90)",
                border: "1px solid rgba(255,255,255,0.16)",
                background: "rgba(255,255,255,0.06)",
                backdropFilter: "blur(10px)",
              }}
            >
              Calendar
            </button>

            {onRemove ? (
              <button
                onClick={onRemove}
                className="h-11 rounded-[15px] px-4 text-[14px] transition-all hover:bg-white/[0.06]"
                style={{
                  color: "rgba(255,255,255,0.48)",
                  border: "1px solid rgba(255,255,255,0.10)",
                }}
              >
                Remove
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Week editorial list ───────────────────────────────────────────────────────

function WeekEditorialLead({
  item,
  onOpen,
  onRemove,
}: {
  item: CandidateCardModel;
  onOpen: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="group rounded-[14px] p-3.5 transition-all hover:bg-white/[0.03]">
      <div className="flex gap-4">
        <div
          className="shrink-0 overflow-hidden rounded-[12px]"
          style={{
            width: "80px",
            height: "120px",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 10px 24px -12px rgba(0,0,0,0.78)",
            flexShrink: 0,
          }}
        >
          {item.posterUrl ? (
            <Image
              src={item.posterUrl}
              alt={item.title}
              width={80}
              height={120}
              quality={80}
              unoptimized
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <ProviderPill name={item.provider} />
            {item.date ? <UrgencyChip label={hoursFromNowLabel(item.date)} /> : null}
          </div>

          <h3 className="mt-2 text-[1.15rem] font-semibold leading-tight tracking-[-0.03em] text-white">
            {item.title}
          </h3>

          <div
            className="mt-1 text-[12px]"
            style={{ color: "rgba(255,255,255,0.72)" }}
          >
            {item.date
              ? `${formatDowMonthDay(item.date)} · ${formatTime(item.date)}`
              : "Release time TBD"}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => onOpen(item.id)}
              className="h-8 rounded-[11px] px-4 text-[12px] font-semibold text-black transition-all hover:scale-[1.02]"
              style={{
                background: "linear-gradient(180deg, #fff 0%, #e0e0e0 100%)",
                boxShadow: "0 8px 18px -12px rgba(255,255,255,0.30)",
              }}
            >
              Open
            </button>
            {item.candidate.relationship === "followed" ? (
              <button
                onClick={() => onRemove(item.id)}
                className="h-8 rounded-[11px] px-4 text-[12px] font-medium transition-all hover:bg-white/[0.08]"
                style={{
                  color: "rgba(255,255,255,0.86)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.05)",
                }}
              >
                Remove
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function WeekEditorialRow({
  item,
  onOpen,
  onRemove,
}: {
  item: CandidateCardModel;
  onOpen: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-4 rounded-[12px] px-3 py-3 transition-all hover:bg-white/[0.04]">
      <div
        className="shrink-0 overflow-hidden rounded-[10px]"
        style={{
          width: "52px",
          height: "76px",
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 8px 18px -10px rgba(0,0,0,0.70)",
          flexShrink: 0,
        }}
      >
        {item.posterUrl ? (
          <Image
            src={item.posterUrl}
            alt={item.title}
            width={52}
            height={76}
            quality={76}
            unoptimized
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-[15px] font-semibold text-white">
            {item.title}
          </span>
          <ProviderPill name={item.provider} />
        </div>

        <div
          className="mt-1 truncate text-[12px]"
          style={{ color: "rgba(255,255,255,0.70)" }}
        >
          {item.date
            ? `${formatDowMonthDay(item.date)} · ${formatTime(item.date)}`
            : "Release time TBD"}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {item.date ? <UrgencyChip label={hoursFromNowLabel(item.date)} /> : null}
        <button
          onClick={() => onOpen(item.id)}
          className="h-9 rounded-[10px] px-3.5 text-[12px] font-semibold text-black transition-all hover:scale-[1.02]"
          style={{
            background: "linear-gradient(180deg, #fff 0%, #e0e0e0 100%)",
            boxShadow: "0 8px 18px -12px rgba(255,255,255,0.28)",
          }}
        >
          Open
        </button>
        {item.candidate.relationship === "followed" ? (
          <button
            onClick={() => onRemove(item.id)}
            className="h-9 rounded-[10px] px-3.5 text-[12px] font-medium transition-all hover:bg-white/[0.08]"
            style={{
              color: "rgba(255,255,255,0.86)",
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.05)",
            }}
          >
            Remove
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function WeekEditorialList({
  items,
  onOpen,
  onCalendar,
  onRemove,
}: {
  items: CandidateCardModel[];
  onOpen: (id: string) => void;
  onCalendar: () => void;
  onRemove: (id: string) => void;
}) {
  const list = items.slice(0, 4);
  const lead = list[0] ?? null;
  const secondary = list.slice(1);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_244px]">
      <div
        className="relative overflow-hidden rounded-[22px] p-4"
        style={{
          background:
            "linear-gradient(155deg, rgba(20,20,20,0.98) 0%, rgba(13,13,13,0.98) 100%)",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow:
            "0 18px 44px -24px rgba(0,0,0,0.84), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        <div
          className="pointer-events-none absolute left-0 top-0 h-px w-3/5"
          style={{
            background:
              "linear-gradient(90deg, rgba(255,255,255,0.18), transparent)",
          }}
        />

        {lead ? (
          <WeekEditorialLead item={lead} onOpen={onOpen} onRemove={onRemove} />
        ) : null}

        {secondary.length ? (
          <div
            className="mt-3 space-y-1 border-t pt-3"
            style={{ borderColor: "rgba(255,255,255,0.08)" }}
          >
            {secondary.map((item) => (
              <WeekEditorialRow
                key={`week-row-${item.id}-${item.date?.toISOString() ?? "none"}`}
                item={item}
                onOpen={onOpen}
                onRemove={onRemove}
              />
            ))}
          </div>
        ) : null}
      </div>

      <div
        className="relative overflow-hidden rounded-[22px] p-4"
        style={{
          background:
            "linear-gradient(155deg, rgba(18,18,18,0.98) 0%, rgba(12,12,12,0.98) 100%)",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow:
            "0 18px 44px -24px rgba(0,0,0,0.84), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        <div
          className="pointer-events-none absolute left-0 top-0 h-px w-1/2"
          style={{
            background:
              "linear-gradient(90deg, rgba(255,255,255,0.16), transparent)",
          }}
        />

        <span
          className="text-[9px] font-bold uppercase tracking-[0.32em]"
          style={{ color: "rgba(255,255,255,0.46)" }}
        >
          Week view
        </span>

        <h3 className="mt-1.5 text-[16px] font-semibold leading-tight tracking-[-0.03em] text-white">
          See the rest
        </h3>

        <p
          className="mt-1.5 text-[12px] leading-5"
          style={{ color: "rgba(255,255,255,0.60)" }}
        >
          Keep the homepage tight. Use calendar for the wider scan.
        </p>

        <div className="mt-3 space-y-1.5">
          {list.slice(0, 3).map((item) => (
            <button
              key={`week-summary-${item.id}`}
              onClick={() => onOpen(item.id)}
              className="flex w-full items-center justify-between gap-2 rounded-[10px] px-2.5 py-2 text-left transition-all hover:bg-white/[0.04]"
            >
              <div className="min-w-0">
                <div className="truncate text-[12px] font-medium text-white">
                  {item.title}
                </div>
                <div
                  className="truncate text-[10px]"
                  style={{ color: "rgba(255,255,255,0.62)" }}
                >
                  {item.date
                    ? `${formatDowMonthDay(item.date)} · ${formatTime(item.date)}`
                    : "TBD"}
                </div>
              </div>

              {item.date ? (
                <span
                  className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    color: "rgba(255,255,255,0.76)",
                    border: "1px solid rgba(255,255,255,0.10)",
                  }}
                >
                  {hoursFromNowLabel(item.date)}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <button
          onClick={onCalendar}
          className="mt-4 h-9 w-full rounded-[12px] px-5 text-[12px] font-semibold text-black transition-all hover:scale-[1.01] active:scale-[0.98]"
          style={{
            background: "linear-gradient(180deg, #ffffff 0%, #e4e4e4 100%)",
            boxShadow: "0 8px 16px -12px rgba(255,255,255,0.28)",
          }}
        >
          Open calendar →
        </button>
      </div>
    </div>
  );
}

// ─── Signed-out promo ──────────────────────────────────────────────────────────

function SignedOutFeatureCard({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <div
      className="group relative overflow-hidden rounded-[18px] p-4"
      style={{
        background:
          "linear-gradient(145deg, rgba(22,22,22,0.98) 0%, rgba(16,16,16,0.98) 100%)",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "0 10px 28px -16px rgba(0,0,0,0.84)",
      }}
    >
      <div
        className="pointer-events-none absolute left-0 top-0 h-px w-3/5"
        style={{
          background:
            "linear-gradient(90deg, rgba(52,211,153,0.28), transparent)",
        }}
      />

      <div className="relative text-[13px] font-semibold text-white">{title}</div>
      <div
        className="relative mt-2 text-[12px] leading-[1.65]"
        style={{ color: "rgba(255,255,255,0.60)" }}
      >
        {detail}
      </div>
    </div>
  );
}

export function SignedOutPromoRail() {
  const ref = useAnimateIn(0, "ww-scale-in");

  return (
    <section ref={ref}>
      <div
        className="relative overflow-hidden rounded-[26px] p-6 md:p-8"
        style={{
          background:
            "linear-gradient(140deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.018) 100%)",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow:
            "0 34px 80px -42px rgba(0,0,0,0.98), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        <div
          className="pointer-events-none absolute left-0 top-0 h-px w-3/5"
          style={{
            background:
              "linear-gradient(90deg, rgba(52,211,153,0.36), rgba(255,255,255,0.10) 50%, transparent)",
          }}
        />

        <div className="relative max-w-3xl">
          <div className="flex items-center gap-2">
            <LiveDot />
            <span
              className="text-[9px] font-bold uppercase tracking-[0.34em]"
              style={{ color: "rgba(255,255,255,0.42)" }}
            >
              Personalized with an account
            </span>
          </div>

          <h2
            className="mt-3 font-black leading-[1.0] tracking-[-0.05em] text-white"
            style={{ fontSize: "clamp(26px, 3.2vw, 38px)" }}
          >
            Stop browsing. Start watching.
          </h2>

          <p
            className="mt-3 max-w-[52ch] text-[14px] leading-[1.72]"
            style={{ color: "rgba(255,255,255,0.62)" }}
          >
            WatchWeek tracks your shows and builds a homepage that tells you
            exactly what matters tonight — without sending you into a content
            maze.
          </p>
        </div>

        <div className="relative mt-6 grid gap-3 sm:grid-cols-3">
          <SignedOutFeatureCard
            title="Tonight at a glance"
            detail="Live countdowns for every episode airing in the next few hours."
          />
          <SignedOutFeatureCard
            title="Zero-noise priority feed"
            detail="Your best things to watch next, ranked by urgency — not algorithms."
          />
          <SignedOutFeatureCard
            title="One calendar to rule them all"
            detail="Everything across every streaming service you actually subscribe to."
          />
        </div>

        <div className="relative mt-6 flex flex-wrap gap-3">
          <a
            href="/login"
            className="inline-flex h-12 items-center justify-center rounded-[17px] px-7 text-[14px] font-semibold text-black transition-all hover:scale-[1.01] active:scale-[0.98]"
            style={{
              background: "linear-gradient(180deg, #fff 0%, #e4e4e4 100%)",
              boxShadow:
                "0 12px 26px -18px rgba(255,255,255,0.34), 0 1px 4px rgba(255,255,255,0.10)",
            }}
          >
            Create free account
          </a>

          <a
            href="/calendar"
            className="inline-flex h-12 items-center justify-center rounded-[17px] px-7 text-[14px] font-medium transition-all hover:bg-white/[0.07]"
            style={{
              color: "rgba(255,255,255,0.88)",
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.05)",
              backdropFilter: "blur(10px)",
            }}
          >
            Preview calendar →
          </a>
        </div>
      </div>
    </section>
  );
}