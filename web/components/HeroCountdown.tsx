"use client";

import { useEffect, useState } from "react";

export default function HeroCountdown({ target }: { target: Date }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = target.getTime() - now;

  if (diff <= 0) {
    return <span className="font-semibold text-emerald-400">Now streaming</span>;
  }

  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  return (
    <span className="font-semibold text-white">
      {h > 0 && `${h}h `}
      {m}m {s}s
    </span>
  );
}