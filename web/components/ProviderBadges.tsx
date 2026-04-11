// web/components/ProviderBadges.tsx
"use client";

import React from "react";
import { uniqueSlugs } from "@/lib/providerSlug";

function initialsFromSlug(slug: string) {
  const parts = slug.split("-").filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function ProviderBadges({
  providers,
  max = 3,
  size = 22,
  className = "",
}: {
  providers?: Array<string | null | undefined>;
  max?: number;
  size?: number; // px
  className?: string;
}) {
  const slugs = uniqueSlugs(providers ?? []).slice(0, max);
  if (!slugs.length) return null;

  return (
    <div className={["flex items-center gap-2", className].join(" ")}>
      {slugs.map((slug) => (
        <div
          key={slug}
          className="flex items-center justify-center rounded-xl bg-black/70 ring-1 ring-white/15 backdrop-blur"
          style={{ width: size + 10, height: size + 10 }}
          title={slug}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/service-logos/${slug}.svg`}
            alt={slug}
            width={size}
            height={size}
            className="h-auto w-auto max-h-full max-w-full"
            onError={(e) => {
              // fallback to initials pill if svg missing
              const img = e.currentTarget;
              img.style.display = "none";
              const parent = img.parentElement;
              if (!parent) return;
              parent.setAttribute("data-fallback", "1");
            }}
          />
          <span
            className="hidden text-[11px] font-semibold text-white"
            style={{ lineHeight: 1 }}
          >
            {initialsFromSlug(slug)}
          </span>
        </div>
      ))}

      {/* If image missing, we switch to initials via CSS */}
      <style jsx>{`
        div[data-fallback="1"] img {
          display: none !important;
        }
        div[data-fallback="1"] span {
          display: inline !important;
        }
      `}</style>
    </div>
  );
}