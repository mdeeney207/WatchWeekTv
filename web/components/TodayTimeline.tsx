"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { shimmerBlurDataURL } from "@/lib/imagePlaceholders";

type TimelineItem = {
  show_id: string;
  show_title: string;
  poster_url?: string | null;
  service_name?: string | null;
  air_date_utc: string;
};

type PositionedTimelineItem = TimelineItem & {
  lane: number;
  leftPercent: number;
};

function formatHour(date: Date) {
  return date.toLocaleTimeString([], { hour: "numeric" });
}

function formatTime(date: Date) {
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTimelineTime(date: Date, timelineStart: Date) {
  const time = formatTime(date);
  const sameDate = date.toDateString() === timelineStart.toDateString();

  if (sameDate) return time;

  return `Next day · ${time}`;
}

function hoursFromNowLabel(target: Date) {
  const ms = target.getTime() - Date.now();
  if (ms <= 0) return "Now";

  const mins = Math.round(ms / 60000);
  if (mins < 60) return `in ${mins}m`;

  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;

  return rem ? `in ${hrs}h ${rem}m` : `in ${hrs}h`;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getTimelineWindow(now: Date) {
  const timelineAnchor = new Date(now);

  if (now.getHours() < 3) {
    timelineAnchor.setDate(timelineAnchor.getDate() - 1);
  }

  const timelineStart = new Date(timelineAnchor);
  timelineStart.setHours(15, 0, 0, 0);

  const timelineEnd = new Date(timelineAnchor);
  timelineEnd.setDate(timelineEnd.getDate() + 1);
  timelineEnd.setHours(3, 0, 0, 0);

  return { timelineStart, timelineEnd };
}

function computePositionedItems(
  items: TimelineItem[],
  timelineStart: Date,
  timelineEnd: Date
): PositionedTimelineItem[] {
  const startMs = timelineStart.getTime();
  const endMs = timelineEnd.getTime();
  const totalSpan = endMs - startMs;

  const visible = [...items]
    .filter((item) => {
      const t = new Date(item.air_date_utc).getTime();
      return t >= startMs && t <= endMs;
    })
    .sort(
      (a, b) =>
        new Date(a.air_date_utc).getTime() - new Date(b.air_date_utc).getTime()
    );

  const laneLastTimes: number[] = [];
  const collisionWindowMs = 60 * 60 * 1000;

  return visible.map((item) => {
    const t = new Date(item.air_date_utc).getTime();

    let lane = 0;
    for (; lane < laneLastTimes.length; lane++) {
      if (t - laneLastTimes[lane] > collisionWindowMs) {
        break;
      }
    }

    laneLastTimes[lane] = t;

    const posRaw = (t - startMs) / totalSpan;
    const leftPercent = clamp(posRaw, 0.05, 0.95);

    return {
      ...item,
      lane,
      leftPercent,
    };
  });
}

export default function TodayTimeline({
  items,
}: {
  items: TimelineItem[];
}) {
  const router = useRouter();
  const [, forceTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      forceTick((x) => (x + 1) % 100000);
    }, 30000);

    return () => window.clearInterval(id);
  }, []);

  const sorted = useMemo(() => {
    return [...items].sort(
      (a, b) =>
        new Date(a.air_date_utc).getTime() - new Date(b.air_date_utc).getTime()
    );
  }, [items]);

  if (!sorted.length) return null;

  const now = new Date();
  const { timelineStart, timelineEnd } = getTimelineWindow(now);
  const totalSpan = timelineEnd.getTime() - timelineStart.getTime();

  const nowMs = Date.now();
  const isNowInsideWindow =
    nowMs >= timelineStart.getTime() && nowMs <= timelineEnd.getTime();

  const markerPosRaw = (nowMs - timelineStart.getTime()) / totalSpan;
  const markerPos = clamp(markerPosRaw, 0, 1);

  const hourMarkers: Date[] = [];
  const marker = new Date(timelineStart);

  while (marker <= timelineEnd) {
    hourMarkers.push(new Date(marker));
    marker.setHours(marker.getHours() + 2);
  }

  const positionedItems = computePositionedItems(
    sorted,
    timelineStart,
    timelineEnd
  );

  if (!positionedItems.length) return null;

  const laneOffsetPx = 76;
  const topPaddingPx = 12;
  const baseCardTopPx = 78;
  const maxLane = Math.max(...positionedItems.map((item) => item.lane), 0);
  const timelineHeight = baseCardTopPx + maxLane * laneOffsetPx + 248;

  return (
    <section className="pt-10 pb-12">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-semibold tracking-tight">
            Today Timeline
          </h2>
          <div className="mt-1 text-sm text-zinc-400">
            See exactly when shows drop tonight
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="relative">
          <div className="mt-4 h-px w-full bg-white/10" />

          <div className="relative mt-3 h-4 text-xs text-zinc-500">
            {hourMarkers.map((t) => {
              const pos = (t.getTime() - timelineStart.getTime()) / totalSpan;

              return (
                <span
                  key={t.toISOString()}
                  className="absolute -translate-x-1/2"
                  style={{ left: `${clamp(pos, 0, 1) * 100}%` }}
                >
                  {formatHour(t)}
                </span>
              );
            })}
          </div>

          {isNowInsideWindow ? (
            <div
              className="pointer-events-none absolute top-0"
              style={{
                left: `${markerPos * 100}%`,
                transform: "translateX(-50%)",
              }}
            >
              <div className="flex flex-col items-center">
                <div className="rounded-full bg-emerald-400 px-2 py-0.5 text-[10px] font-semibold text-black shadow-[0_0_20px_rgba(74,222,128,0.45)]">
                  Now
                </div>
                <div
                  className="mt-2 w-px bg-gradient-to-b from-emerald-400/95 via-emerald-400/35 to-transparent"
                  style={{ height: `${Math.max(218, timelineHeight - 28)}px` }}
                />
                <div className="-mt-2.5 h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(74,222,128,0.7)]" />
              </div>
            </div>
          ) : null}
        </div>

        <div className="relative mt-8" style={{ height: `${timelineHeight}px` }}>
          {positionedItems.map((item) => {
            const t = new Date(item.air_date_utc);
            const top = topPaddingPx + item.lane * laneOffsetPx;
            const left = `${item.leftPercent * 100}%`;

            return (
              <div
                key={`${item.show_id}-${item.air_date_utc}`}
                style={{ left, top }}
                className="absolute -translate-x-1/2 w-[120px]"
              >
                <button
                  onClick={() => router.push(`/tv/${item.show_id}`)}
                  className="group block w-full text-left"
                >
                  <div className="absolute left-1/2 top-[-18px] h-[18px] w-px -translate-x-1/2 bg-white/15" />

                  <div className="relative mx-auto h-[168px] w-[112px] overflow-hidden rounded-[18px] bg-white/5 ring-1 ring-white/10 shadow-[0_14px_40px_-24px_rgba(0,0,0,0.95)] transition duration-200 group-hover:-translate-y-1 group-hover:ring-white/20">
                    {item.poster_url ? (
                      <Image
                        src={item.poster_url}
                        alt={item.show_title}
                        fill
                        sizes="112px"
                        quality={70}
                        unoptimized
                        placeholder="blur"
                        blurDataURL={shimmerBlurDataURL(200, 300)}
                        className="object-cover transition duration-300 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-end bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_60%)] p-3">
                        <div className="line-clamp-3 text-xs font-semibold text-white">
                          {item.show_title}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 text-center">
                    <div className="truncate text-sm font-semibold text-white">
                      {item.show_title}
                    </div>

                    <div className="mt-1 text-xs text-zinc-400">
                      {formatTimelineTime(t, timelineStart)}
                    </div>

                    <div className="mt-0.5 text-xs font-semibold text-zinc-300">
                      {hoursFromNowLabel(t)}
                    </div>

                    {item.service_name ? (
                      <div className="mt-0.5 truncate text-[11px] text-zinc-500">
                        {item.service_name}
                      </div>
                    ) : null}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}