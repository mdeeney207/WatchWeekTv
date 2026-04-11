"use client";

import Link from "next/link";
import React from "react";

type RailProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionHref?: string;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  fadeEdges?: boolean;
  padContent?: boolean;
  compactWhenFew?: boolean;
  itemCount?: number;
};

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export default function Rail({
  title,
  subtitle,
  actionLabel,
  actionHref,
  children,
  className,
  headerClassName,
  contentClassName,
  fadeEdges = true,
  padContent = false,
  compactWhenFew = false,
  itemCount,
}: RailProps) {
  const childArray = React.Children.toArray(children).filter(Boolean);
  const resolvedCount = itemCount ?? childArray.length;
  const showAction = Boolean(actionLabel && actionHref);

  const compact = compactWhenFew && resolvedCount > 0 && resolvedCount <= 2;
  const single = compact && resolvedCount === 1;

  return (
    <section className={cn("relative", className)}>
      <div
        className={cn(
          "mb-5 flex items-end justify-between gap-4 md:mb-6",
          headerClassName
        )}
      >
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl md:text-[1.7rem]">
            {title}
          </h2>

          {subtitle ? (
            <p className="mt-1.5 max-w-3xl text-sm text-zinc-400 sm:text-[15px]">
              {subtitle}
            </p>
          ) : null}
        </div>

        {showAction ? (
          <Link
            href={actionHref!}
            className="shrink-0 text-sm font-medium text-zinc-400 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-white/30"
          >
            {actionLabel} <span aria-hidden="true">→</span>
          </Link>
        ) : null}
      </div>

      <div className="relative">
        {!compact && fadeEdges ? (
          <>
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-2 bg-gradient-to-r from-[#05070A]/85 to-transparent sm:w-3 lg:w-4" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-2 bg-gradient-to-l from-[#05070A]/85 to-transparent sm:w-3 lg:w-4" />
          </>
        ) : null}

        <div
          className={cn(
            compact
              ? "overflow-visible"
              : "no-scrollbar overflow-x-auto overflow-y-hidden scroll-smooth",
            contentClassName
          )}
        >
          <div
            className={cn(
              compact
                ? single
                  ? "grid grid-cols-1"
                  : "grid grid-cols-1 gap-5 xl:grid-cols-2 xl:gap-6"
                : "flex items-start gap-5 px-4 sm:gap-6 sm:px-5 lg:gap-7 lg:px-6",
              padContent && !compact ? "py-1" : ""
            )}
          >
            {compact
              ? childArray.map((child, index) => (
                  <div key={index} className="[&>*]:!w-full [&>*]:max-w-none">
                    {child}
                  </div>
                ))
              : childArray.map((child, index) => (
                  <React.Fragment key={index}>{child}</React.Fragment>
                ))}
          </div>
        </div>
      </div>
    </section>
  );
}