"use client";

import * as React from "react";

type CountdownPillProps = {
  startTimeUtc?: string | null;
  label?: string | null;
  className?: string;
  compact?: boolean;
};

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function formatCountdown(targetIso: string) {
  const now = Date.now();
  const target = new Date(targetIso).getTime();

  if (Number.isNaN(target)) return null;

  const diffMs = target - now;

  if (diffMs <= 0) {
    return {
      short: "Started",
      full: "Started",
      state: "started" as const,
    };
  }

  const totalMinutes = Math.floor(diffMs / 1000 / 60);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return {
      short: `${days}d ${hours}h`,
      full: `Starts in ${days}d ${hours}h`,
      state: "upcoming" as const,
    };
  }

  if (hours > 0) {
    return {
      short: `${hours}h ${minutes}m`,
      full: `Starts in ${hours}h ${minutes}m`,
      state: "upcoming" as const,
    };
  }

  return {
    short: `${minutes}m`,
    full: `Starts in ${minutes}m`,
    state: "upcoming" as const,
  };
}

export function CountdownPill({
  startTimeUtc,
  label,
  className,
  compact = false,
}: CountdownPillProps) {
  const [tick, setTick] = React.useState(() => Date.now());

  React.useEffect(() => {
    if (!startTimeUtc) return;

    const interval = window.setInterval(() => {
      setTick(Date.now());
    }, 30_000);

    return () => window.clearInterval(interval);
  }, [startTimeUtc]);

  void tick;

  const countdown = React.useMemo(() => {
    if (!startTimeUtc) return null;
    return formatCountdown(startTimeUtc);
  }, [startTimeUtc, tick]);

  const text = label?.trim() || countdown?.full || null;

  if (!text) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium tracking-wide",
        "border-white/12 bg-white/6 text-white/82 backdrop-blur-sm",
        compact ? "gap-1.5" : "gap-2",
        className,
      )}
      title={countdown?.full ?? label ?? undefined}
      aria-label={countdown?.full ?? label ?? undefined}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
      <span>{compact && countdown ? countdown.short : text}</span>
    </span>
  );
}

export default CountdownPill;