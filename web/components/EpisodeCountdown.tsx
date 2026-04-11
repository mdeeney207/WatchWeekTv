"use client";

import { useEffect, useState } from "react";

type Props = {
  airDateUTC: string | null | undefined;
  label?: string;
};

function format(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  return { days, hours, minutes };
}

export default function EpisodeCountdown({ airDateUTC, label }: Props) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!airDateUTC) return;

    const target = new Date(airDateUTC).getTime();

    const update = () => {
      const now = Date.now();
      const diff = target - now;

      setRemaining(diff > 0 ? diff : 0);
    };

    update();

    const interval = setInterval(update, 60000); // update every minute

    return () => clearInterval(interval);
  }, [airDateUTC]);

  if (!airDateUTC) return null;

  if (remaining === null) return null;

  const { days, hours, minutes } = format(remaining);

  return (
    <div className="text-sm text-zinc-300">
      <div className="font-medium text-zinc-200">
        {label ?? "Next Episode"}
      </div>

      {remaining > 0 ? (
        <div className="text-lg font-semibold text-white">
          {days}d {hours}h {minutes}m
        </div>
      ) : (
        <div className="text-green-400 font-semibold">
          Now Available
        </div>
      )}
    </div>
  );
}