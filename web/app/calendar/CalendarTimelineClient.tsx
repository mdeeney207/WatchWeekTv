// web/app/calendar/CalendarTimelineClient.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase-browser";
import { getProviderMeta } from "@/lib/providers";

type PersonalEpisodeRow = {
  user_id: string;
  episode_id: string;

  show_id: string;
  show_title: string;

  episode_title: string | null;
  season: number | null;
  episode: number | null;

  air_date_utc: string;

  service_id: string | null;
  service_name: string | null;
  service_web_url: string | null;
  show_web_url: string | null;

  roku_deep_link: string | null;
  ios_deep_link: string | null;
  android_deep_link: string | null;
  android_intent_link: string | null;
  show_url_template: string | null;

  poster_url: string | null;
  logo_url: string | null;

  runtime: number | null;
  still_path: string | null;
  overview: string | null;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function buildSeLabel(season?: number | null, episode?: number | null) {
  if (typeof season === "number" && typeof episode === "number") {
    return `S${pad2(season)}E${pad2(episode)}`;
  }
  return null;
}

function isHttpUrl(u: string) {
  return u.startsWith("http://") || u.startsWith("https://");
}

function resolveBrowserWatchUrl(row: Pick<
  PersonalEpisodeRow,
  "show_web_url" | "service_web_url" | "show_url_template"
>) {
  const candidates = [
    row.show_web_url,
    row.service_web_url,
    row.show_url_template,
  ];

  for (const candidate of candidates) {
    const value = String(candidate ?? "").trim();
    if (value && isHttpUrl(value)) return value;
  }

  return null;
}

function formatLocalTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatLocalDowMonthDay(iso: string) {
  try {
    return new Date(iso).toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function localDayKey(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultRange(): { start: Date; end: Date } {
  const now = new Date();

  const start = new Date(now);
  start.setDate(now.getDate() - 2);
  start.setHours(0, 0, 0, 0);

  const end = new Date(now);
  end.setDate(now.getDate() + 14);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function sectionLabelForDay(dayKey: string) {
  const now = new Date();
  const todayKey = localDayKey(now.toISOString());

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowKey = localDayKey(tomorrow.toISOString());

  if (dayKey === todayKey) return "Tonight";
  if (dayKey === tomorrowKey) return "Tomorrow";
  return null;
}

export default function CalendarTimelineClient() {
  const router = useRouter();
  const { userId, loading: authLoading } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [range] = useState<{ start: Date; end: Date }>(() => defaultRange());
  const [rows, setRows] = useState<PersonalEpisodeRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [selected, setSelected] = useState<PersonalEpisodeRow | null>(null);
  const [watchedSet, setWatchedSet] = useState<Set<string>>(new Set());
  const [refreshKey, setRefreshKey] = useState(0);
  const [hideWatched, setHideWatched] = useState(false);

  useEffect(() => {
    if (!authLoading && !userId) router.push("/login");
  }, [authLoading, userId, router]);

  const queryPersonal = useCallback(
    async (startISO: string, endISO: string) => {
      return await supabase
        .from("upcoming_episodes_personal")
        .select(
          [
            "user_id",
            "episode_id",
            "show_id",
            "show_title",
            "episode_title",
            "season",
            "episode",
            "air_date_utc",
            "service_id",
            "service_name",
            "service_web_url",
            "show_web_url",
            "roku_deep_link",
            "ios_deep_link",
            "android_deep_link",
            "android_intent_link",
            "show_url_template",
            "poster_url",
            "logo_url",
            "runtime",
            "still_path",
            "overview",
          ].join(",")
        )
        .eq("user_id", userId!)
        .gte("air_date_utc", startISO)
        .lt("air_date_utc", endISO)
        .order("air_date_utc", { ascending: true });
    },
    [supabase, userId]
  );

  const loadWatchedForEpisodeIds = useCallback(
    async (episodeIds: string[]) => {
      if (!userId) return new Set<string>();
      if (!episodeIds.length) return new Set<string>();

      const { data, error } = await supabase
        .from("watched_episodes")
        .select("episode_id")
        .eq("user_id", userId)
        .in("episode_id", episodeIds);

      if (error) {
        console.error("watched_episodes query error:", error);
        return new Set<string>();
      }

      return new Set((data ?? []).map((r: { episode_id: string }) => r.episode_id));
    },
    [supabase, userId]
  );

  useEffect(() => {
    if (!userId) return;

    const ch = supabase
      .channel("watchweek-web-timeline-sync")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "watched_episodes",
          filter: `user_id=eq.${userId}`,
        },
        () => setRefreshKey((k) => k + 1)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_shows",
          filter: `user_id=eq.${userId}`,
        },
        () => setRefreshKey((k) => k + 1)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, userId]);

  useEffect(() => {
    let cancelled = false;

    if (authLoading) return;
    if (!userId) return;

    async function load() {
      setLoading(true);

      const startISO = range.start.toISOString();
      const endISO = range.end.toISOString();

      const res = await queryPersonal(startISO, endISO);
      const data: PersonalEpisodeRow[] =
        !res.error && res.data ? (res.data as PersonalEpisodeRow[]) : [];

      if (res.error) {
        console.error("Supabase error (timeline personal):", res.error);
      }

      const episodeIds = data.map((r) => r.episode_id);
      const ws = await loadWatchedForEpisodeIds(episodeIds);

      if (!cancelled) setRows(data);
      if (!cancelled) setWatchedSet(ws);
      if (!cancelled) setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [
    authLoading,
    userId,
    range.start,
    range.end,
    queryPersonal,
    loadWatchedForEpisodeIds,
    refreshKey,
  ]);

  const visibleRows = useMemo(() => {
    if (!hideWatched) return rows;
    return rows.filter((r) => !watchedSet.has(r.episode_id));
  }, [rows, hideWatched, watchedSet]);

  const grouped = useMemo(() => {
    const m = new Map<string, PersonalEpisodeRow[]>();

    for (const r of visibleRows) {
      const key = localDayKey(r.air_date_utc);
      const arr = m.get(key) ?? [];
      arr.push(r);
      m.set(key, arr);
    }

    return Array.from(m.entries()).sort((a, b) => (a[0] < b[0] ? -1 : 1));
  }, [visibleRows]);

  const toggleWatched = useCallback(
    async (episodeId: string) => {
      if (!userId) return;
      const isWatched = watchedSet.has(episodeId);

      if (isWatched) {
        const { error } = await supabase
          .from("watched_episodes")
          .delete()
          .eq("user_id", userId)
          .eq("episode_id", episodeId);

        if (error) {
          console.error("unwatch error:", error);
          return;
        }

        setWatchedSet((prev) => {
          const next = new Set(prev);
          next.delete(episodeId);
          return next;
        });
      } else {
        const { error } = await supabase
          .from("watched_episodes")
          .upsert(
            { user_id: userId, episode_id: episodeId },
            { onConflict: "user_id,episode_id" }
          );

        if (error) {
          console.error("watch error:", error);
          return;
        }

        setWatchedSet((prev) => {
          const next = new Set(prev);
          next.add(episodeId);
          return next;
        });
      }

      setRefreshKey((k) => k + 1);
    },
    [supabase, userId, watchedSet]
  );

  if (authLoading) return <div className="text-white/70">Loading…</div>;
  if (!userId) return null;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 select-none text-sm text-white/70">
          <input
            type="checkbox"
            checked={hideWatched}
            onChange={(e) => setHideWatched(e.target.checked)}
            className="h-4 w-4 rounded border-white/30 bg-black"
          />
          Hide watched
        </label>

        <div className="ml-auto text-xs text-white/50">
          {loading ? "Loading…" : `Episodes: ${visibleRows.length}`}
        </div>
      </div>

      {grouped.length ? (
        <div className="grid gap-6">
          {grouped.map(([dayKey, items]) => {
            const headline = sectionLabelForDay(dayKey);
            const dateLabel = formatLocalDowMonthDay(`${dayKey}T12:00:00`);

            return (
              <section key={dayKey} className="grid gap-3">
                <div className="flex items-end justify-between">
                  <div>
                    {headline ? (
                      <div className="text-xl font-semibold text-white">
                        {headline}
                      </div>
                    ) : (
                      <div className="text-lg font-semibold text-white">
                        {dateLabel}
                      </div>
                    )}
                    {headline ? (
                      <div className="mt-0.5 text-sm text-white/50">
                        {dateLabel}
                      </div>
                    ) : null}
                  </div>

                  <div className="text-xs text-white/50">
                    {items.length} episode{items.length === 1 ? "" : "s"}
                  </div>
                </div>

                <div className="grid gap-2">
                  {items.map((r) => (
                    <EpisodeRow
                      key={r.episode_id}
                      r={r}
                      watched={watchedSet.has(r.episode_id)}
                      onOpen={() => setSelected(r)}
                      onToggleWatched={() => toggleWatched(r.episode_id)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
          <div className="text-white/80">No upcoming episodes</div>
          <div className="mt-2 text-sm text-white/50">
            Follow more shows in{" "}
            <span className="font-semibold text-white/80">My Stuff</span>.
          </div>
          <button
            onClick={() => router.push("/library")}
            className="mt-4 h-10 rounded-2xl bg-white px-4 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            Go to My Stuff
          </button>
        </div>
      )}

      {selected ? (
        <EpisodeModal
          r={selected}
          watched={watchedSet.has(selected.episode_id)}
          onClose={() => setSelected(null)}
          onToggleWatched={() => toggleWatched(selected.episode_id)}
        />
      ) : null}
    </div>
  );
}

function EpisodeRow({
  r,
  watched,
  onOpen,
  onToggleWatched,
}: {
  r: PersonalEpisodeRow;
  watched: boolean;
  onOpen: () => void;
  onToggleWatched: () => void;
}) {
  const providerMeta = r.service_name ? getProviderMeta(r.service_name) : null;
  const t = providerMeta?.theme ?? null;
  const se = buildSeLabel(r.season, r.episode);
  const when = formatLocalTime(r.air_date_utc);

  return (
    <div
      className={[
        "group relative grid grid-cols-[64px_minmax(0,1fr)_auto] gap-3 rounded-3xl p-3 ring-1 transition",
        "bg-white/[0.04] ring-white/10 hover:bg-white/[0.07] hover:ring-white/20",
      ].join(" ")}
    >
      <button
        onClick={onOpen}
        className="relative h-20 w-14 overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/10 transition group-hover:ring-white/20"
      >
        {r.poster_url ? (
          <img
            src={r.poster_url}
            alt={r.show_title}
            className="h-full w-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_60%)]" />
        )}
      </button>

      <button onClick={onOpen} className="min-w-0 text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-base font-semibold text-white">
              {r.show_title}
            </div>

            <div className="mt-0.5 truncate text-sm text-white/72">
              {r.episode_title ?? "Episode"}
            </div>
          </div>

          <div className="shrink-0 text-xs font-medium text-white/55">
            {when}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <div className="min-w-0 text-xs text-white/58">
            {se ? `${se}` : "Episode"}
            {typeof r.runtime === "number" ? ` • ${r.runtime}m` : ""}
          </div>

          {providerMeta && t ? (
            <div
              className={[
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                t.bg,
                t.text,
                t.ring,
              ].join(" ")}
              title={providerMeta.label}
            >
              {r.logo_url ? (
                <img
                  src={r.logo_url}
                  alt={providerMeta.label}
                  className="h-3.5 w-3.5 rounded-sm bg-white/10 object-contain"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : null}
              <span className="whitespace-nowrap">{providerMeta.label}</span>
            </div>
          ) : null}

          {watched ? (
            <span className="inline-flex rounded-full bg-emerald-500/12 px-2 py-1 text-[11px] font-semibold text-emerald-200">
              Watched
            </span>
          ) : null}
        </div>
      </button>

      <div className="flex flex-col items-end justify-center gap-2">
        <button
          onClick={onToggleWatched}
          className={[
            "h-8 rounded-full px-3 text-[11px] font-semibold transition ring-1 ring-inset",
            watched
              ? "bg-emerald-500/15 text-emerald-200 ring-emerald-400/25 hover:bg-emerald-500/25"
              : "bg-white/8 text-white/85 ring-white/15 hover:bg-white/15",
          ].join(" ")}
        >
          {watched ? "Watched" : "Mark watched"}
        </button>

        <button
          onClick={onOpen}
          className="h-8 rounded-full bg-white px-3 text-[11px] font-semibold text-black transition hover:bg-zinc-200"
        >
          View
        </button>
      </div>
    </div>
  );
}

function EpisodeModal({
  r,
  watched,
  onClose,
  onToggleWatched,
}: {
  r: PersonalEpisodeRow;
  watched: boolean;
  onClose: () => void;
  onToggleWatched: () => void;
}) {
  const providerMeta = r.service_name ? getProviderMeta(r.service_name) : null;
  const t = providerMeta?.theme ?? null;
  const se = buildSeLabel(r.season, r.episode);
  const when = `${formatLocalDowMonthDay(r.air_date_utc)} • ${formatLocalTime(
    r.air_date_utc
  )}`;

  const watchUrl = resolveBrowserWatchUrl(r);
  const canWatch = !!watchUrl;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-zinc-950 ring-1 ring-white/10">
        <div className="grid gap-4 p-5">
          <div className="flex gap-4">
            <div className="relative h-32 w-24 shrink-0 overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/10">
              {r.poster_url ? (
                <img
                  src={r.poster_url}
                  alt={r.show_title}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : null}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-xl font-semibold text-white">
                    {watched ? "✅ " : ""}
                    {r.show_title}
                  </div>
                  <div className="mt-1 text-sm text-white/60">{when}</div>
                  <div className="mt-2 text-sm text-white/70">
                    {se ? `${se} • ` : ""}
                    {r.episode_title ?? "Episode"}
                    {typeof r.runtime === "number" ? ` • ${r.runtime}m` : ""}
                  </div>
                </div>

                {providerMeta && t ? (
                  <div
                    className={[
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                      t.bg,
                      t.text,
                      t.ring,
                    ].join(" ")}
                    title={providerMeta.label}
                  >
                    {r.logo_url ? (
                      <img
                        src={r.logo_url}
                        alt={providerMeta.label}
                        className="h-3.5 w-3.5 rounded-sm bg-white/10 object-contain"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : null}
                    <span className="whitespace-nowrap">{providerMeta.label}</span>
                  </div>
                ) : null}
              </div>

              {r.overview ? (
                <div className="mt-3 line-clamp-5 text-sm text-white/70">
                  {r.overview}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-white/10 p-4">
          <button
            onClick={onClose}
            className="h-10 rounded-2xl bg-white/5 px-4 text-sm font-semibold transition hover:bg-white/10 ring-1 ring-white/10"
          >
            Close
          </button>

          <button
            onClick={onToggleWatched}
            className={[
              "h-10 rounded-2xl px-4 text-sm font-semibold transition ring-1 ring-inset",
              watched
                ? "bg-emerald-500/15 text-emerald-200 ring-emerald-400/25 hover:bg-emerald-500/25"
                : "bg-white/10 text-white/90 ring-white/15 hover:bg-white/20",
            ].join(" ")}
          >
            {watched ? "✓ Watched" : "Mark watched"}
          </button>

          <button
            disabled={!canWatch}
            onClick={() => {
              if (watchUrl) {
                window.open(watchUrl, "_blank", "noopener,noreferrer");
              }
            }}
            className={[
              "h-10 rounded-2xl px-4 text-sm font-semibold transition",
              canWatch
                ? "bg-emerald-500 text-[#06130B] hover:bg-emerald-400"
                : "cursor-not-allowed bg-white/10 text-white/40 ring-1 ring-white/10",
            ].join(" ")}
            title={!canWatch ? "No web watch URL yet" : "Open provider"}
          >
            {providerMeta ? `Watch on ${providerMeta.label}` : "Watch"}
          </button>
        </div>
      </div>
    </div>
  );
}