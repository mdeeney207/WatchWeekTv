// web/components/CountryPicker.tsx
"use client";

import React from "react";
import { useCountry, type CountryCode } from "@/lib/country";

export default function CountryPicker({
  compact = true,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  const { country, setCountry, options } = useCountry();

  return (
    <div className={className}>
      <label className="sr-only" htmlFor="ww-country">
        Country
      </label>

      <div className="relative">
        <select
          id="ww-country"
          value={country}
          onChange={(e) => setCountry(e.target.value as CountryCode)}
          className={[
            "h-9 rounded-xl bg-white/5 text-zinc-100 ring-1 ring-white/10",
            "hover:bg-white/7 focus:outline-none focus:ring-2 focus:ring-white/20",
            "px-3 text-sm",
            compact ? "w-[120px]" : "w-[220px]",
          ].join(" ")}
        >
          {options.map((o) => (
            <option key={o.code} value={o.code} className="bg-zinc-950">
              {compact ? o.code : `${o.label} (${o.code})`}
            </option>
          ))}
        </select>

        <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-zinc-300">
          ▾
        </div>
      </div>
    </div>
  );
}