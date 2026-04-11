"use client";

import * as React from "react";

type LiveIndicatorProps = {
  className?: string;
  pulse?: boolean;
  label?: string;
};

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function LiveIndicator({
  className,
  pulse = true,
  label = "LIVE",
}: LiveIndicatorProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-red-400/30 bg-red-500/12 px-2.5 py-1 text-[11px] font-semibold tracking-[0.16em] text-red-200",
        className,
      )}
      aria-label={label}
    >
      <span className="relative flex h-2.5 w-2.5 items-center justify-center">
        {pulse ? (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400/60" />
        ) : null}
        <span className="relative inline-flex h-2 w-2 rounded-full bg-red-400" />
      </span>
      <span>{label}</span>
    </span>
  );
}

export default LiveIndicator;