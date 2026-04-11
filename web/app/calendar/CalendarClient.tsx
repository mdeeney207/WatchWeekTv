// web/app/calendar/CalendarClient.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/AuthProvider";
import { useI18n } from "@/components/I18nProvider";
import { createClient } from "@/lib/supabase-browser";
import { getProviderMeta } from "@/lib/providers";
import {
  getReleaseUrgency,
  urgencyClassName,
} from "@/lib/releases/getReleaseUrgency";
import { isHttpUrl } from "@/lib/watch/resolveWatchLink";

type ViewType = "dayGridMonth" | "timeGridWeek" | "listWeek";

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
  show_ios_url: string | null;
  show_android_url: string | null;

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

type WeekSection = {
  day: Date;
  key: string;
  rows: PersonalEpisodeRow[];
  isToday: boolean;
  isEmpty: boolean;
};

type TimelineSection = {
  day: Date;
  key: string;
  label: string;
  subtitle: string;
  rows: PersonalEpisodeRow[];
  isToday: boolean;
  isTomorrow: boolean;
};

type ResolvedWatchResult = {
  href: string | null;
  kind: "show_web_url" | "service_web_url" | "show_url_template" | "none";
  source: "browser-only" | "none";
};

type CalendarUrgency = {
  label: string;
  badgeClassName: string;
};

const AIR_DATE_DAY_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})/;
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const UTC_MIDNIGHT_RE = /T00:00(?::00(?:\.0+)?)?(?:Z|[+-]00:00)?$/i;
const CALENDAR_SOURCE = "calendar_episodes_personal";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function getIntlLocale(locale: string) {
  return locale === "es" ? "es-ES" : "en-US";
}

function formatDateWithLocale(
  date: Date,
  locale: string,
  options: Intl.DateTimeFormatOptions
) {
  return new Intl.DateTimeFormat(getIntlLocale(locale), options).format(date);
}

function buildTitle(r: {
  show_title: string;
  season?: number | null;
  episode?: number | null;
  episode_title?: string | null;
}) {
  const se =
    typeof r.season === "number" && typeof r.episode === "number"
      ? ` · S${pad2(r.season)}E${pad2(r.episode)}`
      : "";
  const epTitle = r.episode_title ? ` — ${r.episode_title}` : "";
  return `${r.show_title}${se}${epTitle}`;
}

function buildEpisodeMeta(row: PersonalEpisodeRow) {
  const se =
    typeof row.season === "number" && typeof row.episode === "number"
      ? `S${pad2(row.season)}E${pad2(row.episode)}`
      : null;

  if (se && row.episode_title) return `${se} • ${row.episode_title}`;
  if (se) return se;
  if (row.episode_title) return row.episode_title;
  return null;
}

function startOfDay(d: Date) {
  const next = new Date(d);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(d: Date) {
  const next = new Date(d);
  next.setHours(23, 59, 59, 999);
  return next;
}

function startOfWeek(d: Date) {
  const next = startOfDay(d);
  next.setDate(next.getDate() - next.getDay());
  return next;
}

function endOfWeek(d: Date) {
  const next = startOfWeek(d);
  next.setDate(next.getDate() + 6);
  return endOfDay(next);
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

function addDays(d: Date, days: number) {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function dayKeyFromDate(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function dayKeyFromUtcDate(d: Date) {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(
    d.getUTCDate()
  )}`;
}

function getAirDateDayKey(value: string | null | undefined) {
  const raw = String(value ?? "").trim();
  const match = raw.match(AIR_DATE_DAY_KEY_RE);

  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  const parsed = raw ? new Date(raw) : null;
  if (parsed && !Number.isNaN(parsed.getTime())) {
    return dayKeyFromUtcDate(parsed);
  }

  return "";
}

function isDateOnlyAirDate(value: string | null | undefined) {
  const raw = String(value ?? "").trim();
  if (!raw) return true;
  if (DATE_ONLY_RE.test(raw)) return true;

  const normalized = raw.replace(" ", "T");
  return UTC_MIDNIGHT_RE.test(normalized);
}

function dateFromDayKey(dayKey: string) {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

function dayKeyToUtcStartIso(dayKey: string) {
  return `${dayKey}T00:00:00.000Z`;
}

function formatDayKey(
  dayKey: string,
  locale: string,
  options: Intl.DateTimeFormatOptions
) {
  if (!dayKey) return "";
  return formatDateWithLocale(dateFromDayKey(dayKey), locale, options);
}

function formatStableReleaseTimeLabel(
  value: string,
  locale: string,
  timeTbdLabel: string
) {
  if (isDateOnlyAirDate(value)) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return timeTbdLabel;

  return formatDateWithLocale(parsed, locale, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatStableReleaseLabel(value: string, locale: string) {
  if (!value) return "";

  if (!isDateOnlyAirDate(value)) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";

    return formatDateWithLocale(parsed, locale, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  const dayKey = getAirDateDayKey(value);
  return formatDayKey(dayKey, locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function translateUrgencyLabel(
  label: string,
  labels: {
    released: string;
    tonight: string;
    tomorrow: string;
    thisWeek: string;
    upcoming: string;
  }
) {
  const normalized = label.trim().toLowerCase();

  if (normalized === "released") return labels.released;
  if (normalized === "tonight") return labels.tonight;
  if (normalized === "tomorrow") return labels.tomorrow;
  if (normalized === "this week") return labels.thisWeek;
  if (normalized === "upcoming") return labels.upcoming;

  return label;
}

function getCalendarUrgency(
  value: string,
  now: Date,
  labels: {
    released: string;
    tonight: string;
    tomorrow: string;
    thisWeek: string;
    upcoming: string;
  }
): CalendarUrgency {
  if (!isDateOnlyAirDate(value)) {
    const urgency = getReleaseUrgency(value, now);
    return {
      label: translateUrgencyLabel(urgency.label, labels),
      badgeClassName: urgencyClassName(urgency.tone),
    };
  }

  const releaseDayKey = getAirDateDayKey(value);
  const today = startOfDay(now);
  const todayKey = dayKeyFromDate(today);
  const tomorrowKey = dayKeyFromDate(addDays(today, 1));
  const nextSevenEndKey = dayKeyFromDate(addDays(today, 7));

  if (releaseDayKey < todayKey) {
    return {
      label: labels.released,
      badgeClassName:
        "bg-white/5 text-white/45 ring-1 ring-inset ring-white/10",
    };
  }

  if (releaseDayKey === todayKey) {
    return {
      label: labels.tonight,
      badgeClassName:
        "bg-emerald-500/15 text-emerald-200 ring-1 ring-inset ring-emerald-400/25",
    };
  }

  if (releaseDayKey === tomorrowKey) {
    return {
      label: labels.tomorrow,
      badgeClassName:
        "bg-sky-500/15 text-sky-200 ring-1 ring-inset ring-sky-400/25",
    };
  }

  if (releaseDayKey < nextSevenEndKey) {
    return {
      label: labels.thisWeek,
      badgeClassName:
        "bg-amber-500/15 text-amber-100 ring-1 ring-inset ring-amber-400/25",
    };
  }

  return {
    label: labels.upcoming,
    badgeClassName:
      "bg-white/10 text-white/75 ring-1 ring-inset ring-white/10",
  };
}

function formatMonthTitle(d: Date, locale: string) {
  return formatDateWithLocale(d, locale, {
    month: "long",
    year: "numeric",
  });
}

function formatWeekTitle(anchor: Date, locale: string) {
  const start = startOfWeek(anchor);
  const end = endOfWeek(anchor);

  const sameMonth = start.getMonth() === end.getMonth();
  const sameYear = start.getFullYear() === end.getFullYear();

  if (sameMonth && sameYear) {
    return `${formatDateWithLocale(start, locale, {
      month: "long",
      year: "numeric",
    })} · ${start.getDate()}–${end.getDate()}`;
  }

  return `${formatDateWithLocale(start, locale, {
    month: "short",
    day: "numeric",
  })} – ${formatDateWithLocale(end, locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

function formatTimelineTitle(anchor: Date, locale: string) {
  const start = startOfDay(anchor);
  const end = addDays(start, 13);

  return `${formatDateWithLocale(start, locale, {
    month: "long",
    day: "numeric",
  })} – ${formatDateWithLocale(end, locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

function getRangeForView(view: ViewType, anchor: Date) {
  if (view === "dayGridMonth") {
    const monthStart = startOfMonth(anchor);
    const monthEnd = endOfMonth(anchor);
    return {
      start: startOfWeek(monthStart),
      end: endOfWeek(monthEnd),
    };
  }

  if (view === "listWeek") {
    return {
      start: startOfDay(anchor),
      end: endOfDay(addDays(anchor, 13)),
    };
  }

  return {
    start: startOfWeek(anchor),
    end: endOfWeek(anchor),
  };
}

function getHeaderTitle(view: ViewType, anchor: Date, locale: string) {
  if (view === "dayGridMonth") return formatMonthTitle(anchor, locale);
  if (view === "listWeek") return formatTimelineTitle(anchor, locale);
  return formatWeekTitle(anchor, locale);
}

function getLongDayLabel(d: Date, locale: string) {
  return formatDateWithLocale(d, locale, { weekday: "long" });
}

function getShortDateLabel(d: Date, locale: string) {
  return formatDateWithLocale(d, locale, { month: "short", day: "numeric" });
}

function getMonthGridDays(anchor: Date) {
  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);

  const days: Date[] = [];
  const cursor = new Date(gridStart);

  while (cursor <= gridEnd) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  while (days.length < 42) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

function getWeekDays(anchor: Date) {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

function getEpisodeSortTime(row: PersonalEpisodeRow) {
  if (isDateOnlyAirDate(row.air_date_utc)) {
    return dateFromDayKey(getAirDateDayKey(row.air_date_utc)).getTime();
  }

  const parsed = new Date(row.air_date_utc);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function sortEpisodes(a: PersonalEpisodeRow, b: PersonalEpisodeRow) {
  const timeDiff = getEpisodeSortTime(a) - getEpisodeSortTime(b);
  if (timeDiff !== 0) return timeDiff;

  const seasonA =
    typeof a.season === "number" ? a.season : Number.MAX_SAFE_INTEGER;
  const seasonB =
    typeof b.season === "number" ? b.season : Number.MAX_SAFE_INTEGER;
  if (seasonA !== seasonB) return seasonA - seasonB;

  const episodeA =
    typeof a.episode === "number" ? a.episode : Number.MAX_SAFE_INTEGER;
  const episodeB =
    typeof b.episode === "number" ? b.episode : Number.MAX_SAFE_INTEGER;
  if (episodeA !== episodeB) return episodeA - episodeB;

  return buildTitle(a).localeCompare(buildTitle(b));
}

function cleanUrl(value?: string | null) {
  const trimmed = String(value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getBrowserOnlyWatchLink(
  row: PersonalEpisodeRow | null
): ResolvedWatchResult {
  if (!row) {
    return {
      href: null,
      kind: "none",
      source: "none",
    };
  }

  const showWebUrl = cleanUrl(row.show_web_url);
  if (showWebUrl && isHttpUrl(showWebUrl)) {
    return {
      href: showWebUrl,
      kind: "show_web_url",
      source: "browser-only",
    };
  }

  const serviceWebUrl = cleanUrl(row.service_web_url);
  if (serviceWebUrl && isHttpUrl(serviceWebUrl)) {
    return {
      href: serviceWebUrl,
      kind: "service_web_url",
      source: "browser-only",
    };
  }

  const showUrlTemplate = cleanUrl(row.show_url_template);
  if (showUrlTemplate && isHttpUrl(showUrlTemplate)) {
    return {
      href: showUrlTemplate,
      kind: "show_url_template",
      source: "browser-only",
    };
  }

  return {
    href: null,
    kind: "none",
    source: "none",
  };
}

function getWatchButtonLabel(
  providerName: string | null,
  hasWatchUrl: boolean,
  openProviderLabel: string,
  providerUnavailableLabel: string
) {
  if (!hasWatchUrl) return providerUnavailableLabel;

  const label = String(providerName ?? "").trim();
  return label ? `${openProviderLabel}: ${label}` : openProviderLabel;
}

function EpisodePoster({
  src,
  alt,
  className,
}: {
  src: string | null;
  alt: string;
  className?: string;
}) {
  if (!src) {
    return (
      <div
        className={[
          "flex items-center justify-center rounded-lg border border-white/10 bg-white/5 text-[10px] font-bold text-white/30",
          className ?? "",
        ].join(" ")}
      >
        WW
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={[
        "rounded-lg border border-white/10 object-cover",
        className ?? "",
      ].join(" ")}
      loading="lazy"
      referrerPolicy="no-referrer"
    />
  );
}

function ProviderBadge({
  providerName,
  logoUrl,
  small = false,
}: {
  providerName: string | null;
  logoUrl: string | null;
  small?: boolean;
}) {
  if (!providerName) return null;

  const meta = getProviderMeta(providerName);
  const theme = meta.theme;
  const label = meta.label || providerName;

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full ring-1 ring-inset ${theme.bg} ${theme.text} ${theme.ring} ${
        small ? "px-2 py-0.5" : "px-2 py-1"
      }`}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={label}
          className={[
            "rounded-sm bg-white/10 object-contain",
            small ? "h-3 w-3" : "h-3.5 w-3.5",
          ].join(" ")}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : null}
      <span className={small ? "text-[9px] font-bold" : "text-[10px] font-bold"}>
        {label}
      </span>
    </div>
  );
}

function StatPill({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
        {label}
      </div>
      <div className="mt-1 text-sm font-extrabold text-white">{value}</div>
    </div>
  );
}

function WeekReleaseTile({
  row,
  watched,
  now,
  locale,
  timeTbdLabel,
  episodeReleaseLabel,
  watchedLabel,
  runtimeMinutesLabel,
  urgencyLabels,
  onClick,
}: {
  row: PersonalEpisodeRow;
  watched: boolean;
  now: Date;
  locale: string;
  timeTbdLabel: string;
  episodeReleaseLabel: string;
  watchedLabel: string;
  runtimeMinutesLabel: string;
  urgencyLabels: {
    released: string;
    tonight: string;
    tomorrow: string;
    thisWeek: string;
    upcoming: string;
  };
  onClick: () => void;
}) {
  const time = formatStableReleaseTimeLabel(
    row.air_date_utc,
    locale,
    timeTbdLabel
  );
  const meta = buildEpisodeMeta(row);
  const urgency = getCalendarUrgency(row.air_date_utc, now, urgencyLabels);

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-left transition",
        "hover:border-white/20 hover:bg-white/[0.07] hover:ring-1 hover:ring-white/15",
        watched ? "opacity-55" : "opacity-100",
      ].join(" ")}
    >
      <EpisodePoster
        src={row.poster_url}
        alt={row.show_title}
        className="h-16 w-11 flex-shrink-0"
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-extrabold text-white md:text-[15px]">
          {row.show_title}
        </div>
        <div className="truncate text-[11px] text-white/58 md:text-xs">
          {meta ?? episodeReleaseLabel}
        </div>
        <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-2">
          <span className="shrink-0 text-[11px] font-medium text-white/72">
            {time || timeTbdLabel}
          </span>
          {row.runtime ? (
            <>
              <span className="text-[11px] text-white/28">•</span>
              <span className="shrink-0 text-[11px] text-white/52">
                {row.runtime} {runtimeMinutesLabel}
              </span>
            </>
          ) : null}
          <span
            className={[
              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold",
              urgency.badgeClassName,
            ].join(" ")}
          >
            {urgency.label}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {row.service_name ? (
          <ProviderBadge
            providerName={row.service_name}
            logoUrl={row.logo_url}
            small
          />
        ) : null}
        {watched ? (
          <span className="hidden rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-bold text-emerald-200 xl:inline-flex">
            {watchedLabel}
          </span>
        ) : null}
      </div>
    </button>
  );
}

function TimelineReleaseRow({
  row,
  watched,
  now,
  locale,
  timeTbdLabel,
  episodeReleaseLabel,
  watchedLabel,
  markWatchedLabel,
  viewLabel,
  runtimeMinutesLabel,
  urgencyLabels,
  onOpen,
  onToggleWatched,
}: {
  row: PersonalEpisodeRow;
  watched: boolean;
  now: Date;
  locale: string;
  timeTbdLabel: string;
  episodeReleaseLabel: string;
  watchedLabel: string;
  markWatchedLabel: string;
  viewLabel: string;
  runtimeMinutesLabel: string;
  urgencyLabels: {
    released: string;
    tonight: string;
    tomorrow: string;
    thisWeek: string;
    upcoming: string;
  };
  onOpen: () => void;
  onToggleWatched: () => void;
}) {
  const urgency = getCalendarUrgency(row.air_date_utc, now, urgencyLabels);
  const meta = buildEpisodeMeta(row);
  const time = formatStableReleaseTimeLabel(
    row.air_date_utc,
    locale,
    timeTbdLabel
  );

  return (
    <div
      className={[
        "grid gap-3 rounded-[26px] border px-3 py-3 md:grid-cols-[88px_minmax(0,1fr)_auto] md:items-center md:gap-4 md:px-4",
        watched
          ? "border-white/10 bg-white/[0.03] opacity-60"
          : "border-white/10 bg-white/[0.035]",
      ].join(" ")}
    >
      <EpisodePoster
        src={row.poster_url}
        alt={row.show_title}
        className="h-24 w-16 md:h-28 md:w-20"
      />
      <button type="button" onClick={onOpen} className="min-w-0 text-left">
        <div className="flex flex-wrap items-center gap-2">
          <div className="truncate text-xl font-extrabold text-white">
            {row.show_title}
          </div>
          <span
            className={[
              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold",
              urgency.badgeClassName,
            ].join(" ")}
          >
            {urgency.label}
          </span>
          {row.service_name ? (
            <ProviderBadge
              providerName={row.service_name}
              logoUrl={row.logo_url}
              small
            />
          ) : null}
        </div>

        <div className="mt-1 truncate text-base text-white/78">
          {row.episode_title ?? episodeReleaseLabel}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/62">
          {meta ? <span>{meta}</span> : null}
          {meta && time ? <span className="text-white/20">•</span> : null}
          <span>{time || timeTbdLabel}</span>
          {row.runtime ? (
            <>
              <span className="text-white/20">•</span>
              <span>
                {row.runtime} {runtimeMinutesLabel}
              </span>
            </>
          ) : null}
        </div>
      </button>

      <div className="flex flex-col items-start gap-2 md:items-end">
        <div className="text-sm text-white/72">{time || timeTbdLabel}</div>
        <button
          type="button"
          onClick={onToggleWatched}
          className={[
            "rounded-full border px-4 py-2 text-sm font-extrabold transition",
            watched
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
              : "border-white/10 bg-white/5 text-white/85 hover:bg-white/10",
          ].join(" ")}
        >
          {watched ? `✓ ${watchedLabel}` : markWatchedLabel}
        </button>
        <button
          type="button"
          onClick={onOpen}
          className="rounded-full bg-white px-4 py-2 text-sm font-extrabold text-black transition hover:bg-white/90"
        >
          {viewLabel}
        </button>
      </div>
    </div>
  );
}

function MonthEventChip({
  row,
  watched,
  now,
  locale,
  timeTbdLabel,
  urgencyLabels,
  onClick,
}: {
  row: PersonalEpisodeRow;
  watched: boolean;
  now: Date;
  locale: string;
  timeTbdLabel: string;
  urgencyLabels: {
    released: string;
    tonight: string;
    tomorrow: string;
    thisWeek: string;
    upcoming: string;
  };
  onClick: () => void;
}) {
  const urgency = getCalendarUrgency(row.air_date_utc, now, urgencyLabels);
  const time = formatStableReleaseTimeLabel(
    row.air_date_utc,
    locale,
    timeTbdLabel
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[0.045] px-2 py-1.5 text-left transition",
        "hover:border-white/20 hover:bg-white/[0.08]",
        watched ? "opacity-55" : "opacity-100",
      ].join(" ")}
    >
      <EpisodePoster
        src={row.poster_url}
        alt={row.show_title}
        className="h-10 w-7 flex-shrink-0 rounded-md"
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[11px] font-extrabold text-white">
          {row.show_title}
        </div>
        <div className="truncate text-[10px] text-white/58">
          {time || urgency.label}
        </div>
      </div>
    </button>
  );
}

function WeekDaySection({
  section,
  watchedSet,
  now,
  locale,
  todayLabel,
  noReleasesLabel,
  timeTbdLabel,
  episodeReleaseLabel,
  watchedLabel,
  runtimeMinutesLabel,
  formatReleaseCount,
  urgencyLabels,
  onOpen,
}: {
  section: WeekSection;
  watchedSet: Set<string>;
  now: Date;
  locale: string;
  todayLabel: string;
  noReleasesLabel: string;
  timeTbdLabel: string;
  episodeReleaseLabel: string;
  watchedLabel: string;
  runtimeMinutesLabel: string;
  formatReleaseCount: (count: number) => string;
  urgencyLabels: {
    released: string;
    tonight: string;
    tomorrow: string;
    thisWeek: string;
    upcoming: string;
  };
  onOpen: (row: PersonalEpisodeRow) => void;
}) {
  const { day, rows, isToday, isEmpty } = section;

  if (isEmpty) {
    return (
      <section
        className={[
          "rounded-2xl border px-4 py-3",
          isToday
            ? "border-emerald-400/25 bg-emerald-500/[0.05]"
            : "border-white/8 bg-white/[0.02]",
        ].join(" ")}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/42">
                {getLongDayLabel(day, locale)}
              </div>
              {isToday ? (
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
                  {todayLabel}
                </span>
              ) : null}
            </div>
            <div className="mt-1 text-sm font-semibold text-white/72">
              {getShortDateLabel(day, locale)}
            </div>
          </div>
          <div className="text-xs font-medium text-white/38">
            {noReleasesLabel}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className={[
        "rounded-[24px] border p-4 md:p-5",
        isToday
          ? "border-emerald-400/30 bg-emerald-500/[0.08] shadow-[0_0_0_1px_rgba(16,185,129,0.08)]"
          : "border-white/10 bg-white/[0.035]",
      ].join(" ")}
    >
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/45">
              {getLongDayLabel(day, locale)}
            </div>
            {isToday ? (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
                {todayLabel}
              </span>
            ) : null}
          </div>
          <div className="mt-1 text-2xl font-extrabold text-white">
            {getShortDateLabel(day, locale)}
          </div>
        </div>
        <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-white/70">
          {formatReleaseCount(rows.length)}
        </div>
      </header>

      <div className="grid gap-2.5">
        {rows.map((row) => (
          <WeekReleaseTile
            key={row.episode_id}
            row={row}
            watched={watchedSet.has(row.episode_id)}
            now={now}
            locale={locale}
            timeTbdLabel={timeTbdLabel}
            episodeReleaseLabel={episodeReleaseLabel}
            watchedLabel={watchedLabel}
            runtimeMinutesLabel={runtimeMinutesLabel}
            urgencyLabels={urgencyLabels}
            onClick={() => onOpen(row)}
          />
        ))}
      </div>
    </section>
  );
}

export default function CalendarClient({
  forcedView,
}: {
  forcedView?: ViewType;
}) {
  const router = useRouter();
  const { userId, loading: authLoading } = useAuth();
  const { locale, messages } = useI18n();
  const supabase = useMemo(() => createClient(), []);

  const common = messages.common;
  const calendar = messages.calendar;

  const urgencyLabels = useMemo(
    () => ({
      released: calendar.labels.released,
      tonight: calendar.labels.tonight,
      tomorrow: calendar.labels.tomorrow,
      thisWeek: calendar.labels.thisWeek,
      upcoming: calendar.labels.upcoming,
    }),
    [calendar.labels]
  );

  const formatEpisodeCount = useCallback(
    (count: number) =>
      `${count} ${
        count === 1 ? calendar.counts.episodeOne : calendar.counts.episodeOther
      }`,
    [calendar.counts.episodeOne, calendar.counts.episodeOther]
  );

  const formatReleaseCount = useCallback(
    (count: number) =>
      `${count} ${
        count === 1 ? calendar.counts.releaseOne : calendar.counts.releaseOther
      }`,
    [calendar.counts.releaseOne, calendar.counts.releaseOther]
  );

  const [view, setView] = useState<ViewType>(forcedView ?? "listWeek");
  const [anchorDate, setAnchorDate] = useState<Date>(new Date());
  const [episodes, setEpisodes] = useState<PersonalEpisodeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<PersonalEpisodeRow | null>(null);
  const [watchedSet, setWatchedSet] = useState<Set<string>>(new Set());
  const [refreshKey, setRefreshKey] = useState(0);
  const [hideWatched, setHideWatched] = useState(false);
  const [now, setNow] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [providerFilter, setProviderFilter] = useState("all");

  useEffect(() => {
    if (typeof window === "undefined") return;

    console.log("[CalendarDebug] env", {
      supabaseUrl:
        process.env.NEXT_PUBLIC_SUPABASE_URL ??
        process.env.EXPO_PUBLIC_SUPABASE_URL ??
        null,
      pathname: window.location.pathname,
      origin: window.location.origin,
    });
  }, []);

  useEffect(() => {
    console.log("[CalendarDebug] auth", {
      authLoading,
      userId,
    });

    if (!authLoading && !userId) router.push("/login");
  }, [authLoading, userId, router]);

  useEffect(() => {
    if (forcedView) setView(forcedView);
  }, [forcedView]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!selected) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [selected]);

  const visibleRange = useMemo(
    () => getRangeForView(view, anchorDate),
    [view, anchorDate]
  );

  const visibleDayRange = useMemo(() => {
    const startDayKey = dayKeyFromDate(visibleRange.start);
    const endExclusiveDayKey = dayKeyFromDate(addDays(visibleRange.end, 1));

    return {
      startDayKey,
      endExclusiveDayKey,
      startISO: dayKeyToUtcStartIso(startDayKey),
      endExclusiveISO: dayKeyToUtcStartIso(endExclusiveDayKey),
    };
  }, [visibleRange.start, visibleRange.end]);

  const queryPersonal = useCallback(
    async (startISO: string, endISO: string) => {
      if (!userId) return { data: [], error: null };

      console.log("[CalendarDebug] queryPersonal:start", {
        userId,
        startISO,
        endISO,
        table: CALENDAR_SOURCE,
        view,
      });

      return await supabase
        .from(CALENDAR_SOURCE)
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
            "show_ios_url",
            "show_android_url",
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
        .eq("user_id", userId)
        .gte("air_date_utc", startISO)
        .lt("air_date_utc", endISO)
        .order("air_date_utc", { ascending: true });
    },
    [supabase, userId, view]
  );

  const loadWatchedForEpisodeIds = useCallback(
    async (episodeIds: string[]) => {
      if (!userId || !episodeIds.length) return new Set<string>();

      const { data, error } = await supabase
        .from("watched_episodes")
        .select("episode_id")
        .eq("user_id", userId)
        .in("episode_id", episodeIds);

      if (error) {
        console.error("[CalendarDebug] watched_episodes query error", error);
        return new Set<string>();
      }

      console.log("[CalendarDebug] watched_episodes loaded", {
        userId,
        requestedEpisodeIds: episodeIds.length,
        watchedCount: (data ?? []).length,
      });

      return new Set(
        (data ?? []).map((r: { episode_id: string }) => r.episode_id)
      );
    },
    [supabase, userId]
  );

  useEffect(() => {
    if (!userId) return;

    const ch = supabase
      .channel("watchweek-web-sync")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "watched_episodes",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          console.log("[CalendarDebug] realtime hit", {
            table: "watched_episodes",
            userId,
          });
          setRefreshKey((k) => k + 1);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_shows",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          console.log("[CalendarDebug] realtime hit", {
            table: "user_shows",
            userId,
          });
          setRefreshKey((k) => k + 1);
        }
      )
      .subscribe((status) => {
        console.log("[CalendarDebug] realtime status", {
          status,
          userId,
        });
      });

    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, userId]);

  useEffect(() => {
    let cancelled = false;

    if (authLoading || !userId) return;

    async function load() {
      setLoading(true);

      try {
        const res = await queryPersonal(
          visibleDayRange.startISO,
          visibleDayRange.endExclusiveISO
        );
        const rows: PersonalEpisodeRow[] =
          !res.error && res.data ? (res.data as PersonalEpisodeRow[]) : [];

        if (res.error) {
          console.error("[CalendarDebug] calendar query error", res.error);
        }

        const ws = await loadWatchedForEpisodeIds(rows.map((r) => r.episode_id));

        if (cancelled) return;

        console.log("[CalendarDebug] calendar load complete", {
          userId,
          view,
          calendarSource: CALENDAR_SOURCE,
          anchorDate: anchorDate.toISOString(),
          startDayKey: visibleDayRange.startDayKey,
          endExclusiveDayKey: visibleDayRange.endExclusiveDayKey,
          startISO: visibleDayRange.startISO,
          endExclusiveISO: visibleDayRange.endExclusiveISO,
          rowCount: rows.length,
          providerNames: Array.from(
            new Set(rows.map((r) => (r.service_name ?? "").trim()).filter(Boolean))
          ).sort(),
          firstRows: rows.slice(0, 10).map((r) => ({
            user_id: r.user_id,
            episode_id: r.episode_id,
            show_title: r.show_title,
            episode_title: r.episode_title,
            service_name: r.service_name,
            air_date_utc: r.air_date_utc,
            release_day_key: getAirDateDayKey(r.air_date_utc),
            show_web_url: r.show_web_url,
            service_web_url: r.service_web_url,
            show_url_template: r.show_url_template,
          })),
        });

        setEpisodes(rows);
        setWatchedSet(ws);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [
    authLoading,
    userId,
    queryPersonal,
    loadWatchedForEpisodeIds,
    refreshKey,
    view,
    anchorDate,
    visibleDayRange.startDayKey,
    visibleDayRange.endExclusiveDayKey,
    visibleDayRange.startISO,
    visibleDayRange.endExclusiveISO,
  ]);

  const availableProviders = useMemo(() => {
    return Array.from(
      new Set(
        episodes
          .map((row) => (row.service_name ?? "").trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [episodes]);

  const visibleEpisodes = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    const base = episodes.filter((row) => {
      if (hideWatched && watchedSet.has(row.episode_id)) return false;

      if (providerFilter !== "all" && row.service_name !== providerFilter) {
        return false;
      }

      if (!q) return true;

      const haystack = [row.show_title, row.episode_title, row.service_name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });

    return [...base].sort(sortEpisodes);
  }, [episodes, hideWatched, watchedSet, searchTerm, providerFilter]);

  const episodesByDay = useMemo(() => {
    const map = new Map<string, PersonalEpisodeRow[]>();

    for (const row of visibleEpisodes) {
      const key = getAirDateDayKey(row.air_date_utc);
      if (!key) continue;

      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    }

    for (const [, list] of map) list.sort(sortEpisodes);
    return map;
  }, [visibleEpisodes]);

  const weekDays = useMemo(() => getWeekDays(anchorDate), [anchorDate]);
  const monthDays = useMemo(() => getMonthGridDays(anchorDate), [anchorDate]);

  const weekSections = useMemo<WeekSection[]>(() => {
    return weekDays.map((day) => {
      const key = dayKeyFromDate(day);
      const rows = [...(episodesByDay.get(key) ?? [])].sort(sortEpisodes);

      return {
        day,
        key,
        rows,
        isToday: isSameDay(day, now),
        isEmpty: rows.length === 0,
      };
    });
  }, [weekDays, episodesByDay, now]);

  const timelineSections = useMemo<TimelineSection[]>(() => {
    const todayKey = dayKeyFromDate(startOfDay(now));
    const tomorrowKey = dayKeyFromDate(addDays(startOfDay(now), 1));

    return [...episodesByDay.entries()]
      .map(([key, rows]) => {
        const day = dateFromDayKey(key);
        const isToday = key === todayKey;
        const isTomorrow = key === tomorrowKey;

        let label = formatDayKey(key, locale, {
          weekday: "short",
          month: "short",
          day: "numeric",
        });

        if (isToday) label = common.today;
        if (isTomorrow) label = common.tomorrow;

        return {
          day,
          key,
          rows,
          label,
          subtitle: formatDayKey(key, locale, {
            weekday: "long",
            month: "short",
            day: "numeric",
          }),
          isToday,
          isTomorrow,
        };
      })
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [episodesByDay, now, locale, common.today, common.tomorrow]);

  const filteredStats = useMemo(() => {
    const todayStart = startOfDay(now);
    const todayKey = dayKeyFromDate(todayStart);
    const nextSevenEndKey = dayKeyFromDate(addDays(todayStart, 7));

    const tonightCount = visibleEpisodes.filter((row) => {
      const dayKey = getAirDateDayKey(row.air_date_utc);
      return dayKey === todayKey;
    }).length;

    const next7Count = visibleEpisodes.filter((row) => {
      const dayKey = getAirDateDayKey(row.air_date_utc);
      return dayKey >= todayKey && dayKey < nextSevenEndKey;
    }).length;

    const unwatchedCount = visibleEpisodes.filter(
      (row) => !watchedSet.has(row.episode_id)
    ).length;

    return {
      tonightCount,
      next7Count,
      unwatchedCount,
      totalVisible: visibleEpisodes.length,
    };
  }, [visibleEpisodes, watchedSet, now]);

  const selectedWatched = selected ? watchedSet.has(selected.episode_id) : false;
  const resolvedWatchLink = getBrowserOnlyWatchLink(selected);
  const watchUrl = resolvedWatchLink.href;
  const hasWatchUrl = Boolean(watchUrl);
  const watchLabel = getWatchButtonLabel(
    selected?.service_name ?? null,
    hasWatchUrl,
    calendar.labels.openProvider,
    calendar.labels.providerUnavailable
  );
  const selectedUrgency = selected
    ? getCalendarUrgency(selected.air_date_utc, now, urgencyLabels)
    : null;
  const selectedReleaseLabel = selected
    ? formatStableReleaseLabel(selected.air_date_utc, locale)
    : null;
  const selectedTimeLabel = selected
    ? formatStableReleaseTimeLabel(
        selected.air_date_utc,
        locale,
        calendar.labels.timeTbd
      )
    : null;

  useEffect(() => {
    if (!selected) return;

    console.log("[CalendarDebug] selected row", {
      userId,
      show_title: selected.show_title,
      episode_title: selected.episode_title,
      service_name: selected.service_name,
      air_date_utc: selected.air_date_utc,
      release_day_key: getAirDateDayKey(selected.air_date_utc),
      show_web_url: selected.show_web_url,
      service_web_url: selected.service_web_url,
      show_url_template: selected.show_url_template,
      show_ios_url: selected.show_ios_url,
      show_android_url: selected.show_android_url,
      ios_deep_link: selected.ios_deep_link,
      android_deep_link: selected.android_deep_link,
      android_intent_link: selected.android_intent_link,
      roku_deep_link: selected.roku_deep_link,
      resolvedWatchLink,
      watchUrl,
      hasWatchUrl,
    });
  }, [selected, resolvedWatchLink, watchUrl, hasWatchUrl, userId]);

  const goPrev = useCallback(() => {
    setAnchorDate((prev) => {
      const next = new Date(prev);
      if (view === "dayGridMonth") next.setMonth(next.getMonth() - 1);
      else if (view === "listWeek") next.setDate(next.getDate() - 14);
      else next.setDate(next.getDate() - 7);
      return next;
    });
  }, [view]);

  const goNext = useCallback(() => {
    setAnchorDate((prev) => {
      const next = new Date(prev);
      if (view === "dayGridMonth") next.setMonth(next.getMonth() + 1);
      else if (view === "listWeek") next.setDate(next.getDate() + 14);
      else next.setDate(next.getDate() + 7);
      return next;
    });
  }, [view]);

  const goToday = useCallback(() => {
    setAnchorDate(new Date());
  }, []);

  const toggleWatchedForRow = useCallback(
    async (row: PersonalEpisodeRow) => {
      if (!userId) return;

      const episodeId = row.episode_id;
      const isWatched = watchedSet.has(episodeId);

      if (isWatched) {
        const { error } = await supabase
          .from("watched_episodes")
          .delete()
          .eq("user_id", userId)
          .eq("episode_id", episodeId);

        if (error) {
          console.error("[CalendarDebug] unwatch error", error);
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
          console.error("[CalendarDebug] watch error", error);
          return;
        }

        setWatchedSet((prev) => new Set(prev).add(episodeId));
      }

      setRefreshKey((k) => k + 1);
    },
    [supabase, userId, watchedSet]
  );

  const toggleWatched = useCallback(async () => {
    if (!selected) return;
    await toggleWatchedForRow(selected);
  }, [selected, toggleWatchedForRow]);

  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setProviderFilter("all");
    setHideWatched(false);
  }, []);

  if (authLoading) {
    return <div className="p-4 text-zinc-200">{common.loading}</div>;
  }

  if (!userId) return null;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        {!forcedView ? (
          <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1">
            <button
              type="button"
              onClick={() => {
                setView("listWeek");
                setAnchorDate(new Date());
              }}
              className={[
                "rounded-full px-4 py-2 text-sm font-semibold transition",
                view === "listWeek"
                  ? "bg-white text-black"
                  : "text-white/70 hover:text-white",
              ].join(" ")}
            >
              {calendar.views.timeline}
            </button>
            <button
              type="button"
              onClick={() => setView("timeGridWeek")}
              className={[
                "rounded-full px-4 py-2 text-sm font-semibold transition",
                view === "timeGridWeek"
                  ? "bg-white text-black"
                  : "text-white/70 hover:text-white",
              ].join(" ")}
            >
              {calendar.views.week}
            </button>
            <button
              type="button"
              onClick={() => setView("dayGridMonth")}
              className={[
                "rounded-full px-4 py-2 text-sm font-semibold transition",
                view === "dayGridMonth"
                  ? "bg-white text-black"
                  : "text-white/70 hover:text-white",
              ].join(" ")}
            >
              {calendar.views.month}
            </button>
          </div>
        ) : null}

        <div className="ml-auto text-right">
          <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/40">
            {view === "dayGridMonth"
              ? calendar.header.monthlyKicker
              : view === "listWeek"
                ? calendar.header.releaseFeedKicker
                : calendar.header.weeklyKicker}
          </div>
          <div className="mt-1 text-sm text-white/65">
            {view === "dayGridMonth"
              ? calendar.header.monthlySubcopy
              : view === "listWeek"
                ? calendar.header.releaseFeedSubcopy
                : calendar.header.weeklySubcopy}
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_160px_auto]">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
            {calendar.filters.search}
          </div>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={calendar.filters.searchPlaceholder}
            className="mt-2 w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35"
          />
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
            {calendar.filters.provider}
          </div>
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="mt-2 w-full bg-transparent text-sm text-white outline-none"
          >
            <option value="all" className="bg-[#0B0F14]">
              {calendar.filters.allProviders}
            </option>
            {availableProviders.map((provider) => (
              <option
                key={provider}
                value={provider}
                className="bg-[#0B0F14]"
              >
                {provider}
              </option>
            ))}
          </select>
        </div>

        <label className="flex select-none items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/75">
          <input
            type="checkbox"
            checked={hideWatched}
            onChange={(e) => setHideWatched(e.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-white/10"
          />
          {calendar.filters.hideWatched}
        </label>

        <div className="flex items-center justify-end">
          {(searchTerm || providerFilter !== "all" || hideWatched) && (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-full border border-white/15 bg-white/8 px-4 py-2 text-sm font-extrabold text-white/90 transition hover:bg-white/14"
            >
              {calendar.filters.clearFilters}
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-4">
        <StatPill
          label={calendar.stats.visible}
          value={filteredStats.totalVisible}
        />
        <StatPill
          label={calendar.stats.tonight}
          value={filteredStats.tonightCount}
        />
        <StatPill
          label={calendar.stats.next7Days}
          value={filteredStats.next7Count}
        />
        <StatPill
          label={calendar.stats.unwatched}
          value={filteredStats.unwatchedCount}
        />
      </div>

      <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-3 shadow-[0_16px_60px_rgba(0,0,0,0.35)]">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] p-1">
            <button
              type="button"
              onClick={goPrev}
              className="rounded-full px-3 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/10"
            >
              {calendar.nav.prev}
            </button>
            <button
              type="button"
              onClick={goToday}
              className="rounded-full px-3 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/10"
            >
              {calendar.nav.today}
            </button>
            <button
              type="button"
              onClick={goNext}
              className="rounded-full px-3 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/10"
            >
              {calendar.nav.next}
            </button>
          </div>

          <div className="min-w-0 flex-1 px-1">
            <div className="truncate text-base font-extrabold text-white md:text-lg">
              {getHeaderTitle(view, anchorDate, locale)}
            </div>
            <div className="text-xs text-white/50">
              {calendar.header.streamingReleaseCalendar}
            </div>
          </div>

          <div className="text-sm text-white/65">
            {loading ? common.loading : formatEpisodeCount(visibleEpisodes.length)}
          </div>
        </div>

        {view === "listWeek" ? (
          <div className="space-y-6">
            {timelineSections.length === 0 ? (
              <div className="rounded-[24px] border border-white/10 bg-white/[0.025] px-5 py-8 text-center">
                <div className="text-sm font-semibold text-white/75">
                  {episodes.length === 0
                    ? calendar.empty.nothingScheduledYet
                    : calendar.empty.nothingMatches}
                </div>
                <div className="mt-2 text-sm text-white/45">
                  {episodes.length === 0
                    ? calendar.empty.followMore
                    : calendar.empty.clearFilterHelp}
                </div>
                {episodes.length > 0 ? (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-4 rounded-full bg-white px-4 py-2 text-sm font-extrabold text-black transition hover:bg-white/90"
                  >
                    {calendar.filters.clearFilters}
                  </button>
                ) : null}
              </div>
            ) : (
              timelineSections.map((section) => (
                <section key={section.key} className="space-y-3">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-3xl font-extrabold text-white">
                          {section.label}
                        </h2>
                        {section.isToday ? (
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
                            {calendar.labels.tonight}
                          </span>
                        ) : null}
                        {section.isTomorrow ? (
                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/75">
                            {calendar.labels.nextUp}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 text-sm text-white/52">
                        {section.subtitle}
                      </div>
                    </div>

                    <div className="text-sm text-white/65">
                      {formatEpisodeCount(section.rows.length)}
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {section.rows.map((row) => (
                      <TimelineReleaseRow
                        key={row.episode_id}
                        row={row}
                        watched={watchedSet.has(row.episode_id)}
                        now={now}
                        locale={locale}
                        timeTbdLabel={calendar.labels.timeTbd}
                        episodeReleaseLabel={calendar.labels.episodeRelease}
                        watchedLabel={calendar.labels.watched}
                        markWatchedLabel={calendar.labels.markWatched}
                        viewLabel={calendar.labels.view}
                        runtimeMinutesLabel={calendar.modal.runtimeMinutes}
                        urgencyLabels={urgencyLabels}
                        onOpen={() => setSelected(row)}
                        onToggleWatched={() => toggleWatchedForRow(row)}
                      />
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        ) : view === "timeGridWeek" ? (
          <section className="space-y-3 md:space-y-4">
            <div className="px-1 pb-1">
              <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/38">
                {calendar.header.thisWeekEyebrow}
              </div>
              <div className="mt-1 text-xl font-extrabold text-white md:text-2xl">
                {calendar.header.upcomingReleases}
              </div>
            </div>
            <div className="grid gap-2.5 md:gap-3">
              {weekSections.map((section) => (
                <WeekDaySection
                  key={section.key}
                  section={section}
                  watchedSet={watchedSet}
                  now={now}
                  locale={locale}
                  todayLabel={common.today}
                  noReleasesLabel={calendar.labels.noReleases}
                  timeTbdLabel={calendar.labels.timeTbd}
                  episodeReleaseLabel={calendar.labels.episodeRelease}
                  watchedLabel={calendar.labels.watched}
                  runtimeMinutesLabel={calendar.modal.runtimeMinutes}
                  formatReleaseCount={formatReleaseCount}
                  urgencyLabels={urgencyLabels}
                  onOpen={setSelected}
                />
              ))}
            </div>
          </section>
        ) : (
          <div className="overflow-hidden rounded-[24px] border border-white/10">
            <div className="grid grid-cols-7 border-b border-white/10 bg-white/[0.04]">
              {calendar.month.weekdays.map((label) => (
                <div
                  key={label}
                  className="px-2 py-3 text-center text-xs font-bold uppercase tracking-[0.18em] text-white/45"
                >
                  {label}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {monthDays.map((day) => {
                const key = dayKeyFromDate(day);
                const dayEpisodes = episodesByDay.get(key) ?? [];
                const isToday = isSameDay(day, now);
                const inMonth = isSameMonth(day, anchorDate);

                const visibleItems = dayEpisodes.slice(0, 2);
                const overflow = Math.max(0, dayEpisodes.length - visibleItems.length);

                return (
                  <div
                    key={key}
                    className={[
                      "min-h-[150px] border-b border-r border-white/10 p-2 align-top",
                      inMonth ? "bg-white/[0.025]" : "bg-black/10",
                      isToday ? "ring-1 ring-inset ring-emerald-400/35" : "",
                    ].join(" ")}
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div
                        className={[
                          "text-sm font-extrabold",
                          inMonth ? "text-white" : "text-white/35",
                        ].join(" ")}
                      >
                        {day.getDate()}
                      </div>

                      {isToday ? (
                        <div className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
                          {common.today}
                        </div>
                      ) : null}
                    </div>

                    {visibleItems.length ? (
                      <div className="flex flex-col gap-1.5">
                        {visibleItems.map((row) => (
                          <MonthEventChip
                            key={row.episode_id}
                            row={row}
                            watched={watchedSet.has(row.episode_id)}
                            now={now}
                            locale={locale}
                            timeTbdLabel={calendar.labels.timeTbd}
                            urgencyLabels={urgencyLabels}
                            onClick={() => setSelected(row)}
                          />
                        ))}
                        {overflow > 0 ? (
                          <button
                            type="button"
                            onClick={() => {
                              setAnchorDate(day);
                              setView("timeGridWeek");
                            }}
                            className="rounded-lg px-2 py-1 text-left text-[10px] font-medium text-white/55 transition hover:bg-white/[0.05] hover:text-white/80"
                          >
                            +{overflow} {calendar.counts.more}
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setSelected(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-3xl overflow-hidden rounded-[28px] border border-white/10 bg-[#0B0F14] shadow-[0_24px_90px_rgba(0,0,0,0.6)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-48 w-full border-b border-white/10 bg-white/[0.03] md:h-56">
              {selected.still_path ? (
                <>
                  <img
                    src={selected.still_path}
                    alt={selected.show_title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F14] via-[#0B0F14]/40 to-black/20" />
                </>
              ) : (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]" />
              )}

              <button
                className="absolute right-4 top-4 h-10 w-10 rounded-full border border-white/10 bg-black/35 text-white/85 backdrop-blur hover:bg-black/50"
                onClick={() => setSelected(null)}
                aria-label={calendar.modal.closeAria}
              >
                ✕
              </button>
            </div>

            <div className="relative -mt-14 px-4 pb-4 md:px-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-end">
                <div className="shrink-0">
                  {selected.poster_url ? (
                    <img
                      src={selected.poster_url}
                      alt={selected.show_title}
                      className="h-40 w-28 rounded-2xl border border-white/10 object-cover shadow-[0_20px_40px_rgba(0,0,0,0.45)]"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="h-40 w-28 rounded-2xl border border-white/10 bg-white/10" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <ProviderBadge
                      providerName={selected.service_name}
                      logoUrl={selected.logo_url}
                    />
                    {selectedWatched ? (
                      <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold text-emerald-200">
                        {calendar.labels.watched}
                      </span>
                    ) : null}
                    {selectedUrgency ? (
                      <span
                        className={[
                          "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold",
                          selectedUrgency.badgeClassName,
                        ].join(" ")}
                      >
                        {selectedUrgency.label}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 text-xl font-extrabold text-white md:text-2xl">
                    {buildTitle(selected)}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/70">
                    <span>{selectedReleaseLabel}</span>
                    {selectedTimeLabel ? (
                      <>
                        <span className="text-white/25">•</span>
                        <span>{selectedTimeLabel}</span>
                      </>
                    ) : null}
                    {selected.runtime ? (
                      <>
                        <span className="text-white/25">•</span>
                        <span>
                          {selected.runtime} {calendar.modal.runtimeMinutes}
                        </span>
                      </>
                    ) : null}
                  </div>

                  {selected.overview ? (
                    <div className="mt-3 max-w-2xl text-sm leading-relaxed text-white/75">
                      {selected.overview}
                    </div>
                  ) : null}

                  {!hasWatchUrl ? (
                    <div className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-100">
                      {calendar.modal.providerUnavailableOnWeb}
                    </div>
                  ) : null}

                  <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] font-medium text-white/60">
                    <div>
                      {calendar.labels.webSource}:{" "}
                      <span className="font-extrabold text-white/85">
                        {resolvedWatchLink.source}
                      </span>
                      {" · "}
                      {calendar.labels.kind}:{" "}
                      <span className="font-extrabold text-white/85">
                        {resolvedWatchLink.kind}
                      </span>
                    </div>

                    <div className="mt-2 break-all">
                      {calendar.labels.chosenUrl}:{" "}
                      <span className="font-extrabold text-white/85">
                        {watchUrl ?? common.none}
                      </span>
                    </div>

                    <div className="mt-2 break-all">
                      {calendar.labels.releaseDayKey}:{" "}
                      <span className="font-extrabold text-white/85">
                        {getAirDateDayKey(selected.air_date_utc)}
                      </span>
                    </div>

                    <div className="mt-2 break-all">
                      {calendar.labels.showWebUrl}:{" "}
                      <span className="font-extrabold text-white/85">
                        {selected.show_web_url ?? common.none}
                      </span>
                    </div>

                    <div className="mt-1 break-all">
                      {calendar.labels.serviceWebUrl}:{" "}
                      <span className="font-extrabold text-white/85">
                        {selected.service_web_url ?? common.none}
                      </span>
                    </div>

                    <div className="mt-1 break-all">
                      {calendar.labels.showUrlTemplate}:{" "}
                      <span className="font-extrabold text-white/85">
                        {selected.show_url_template ?? common.none}
                      </span>
                    </div>

                    <div className="mt-1 break-all">
                      {calendar.labels.rowUserId}:{" "}
                      <span className="font-extrabold text-white/85">
                        {selected.user_id}
                      </span>
                    </div>

                    <div className="mt-1 break-all">
                      {calendar.labels.currentAuthUserId}:{" "}
                      <span className="font-extrabold text-white/85">
                        {userId}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-end gap-2 border-t border-white/10 pt-4">
                <button
                  className={`rounded-full border px-4 py-2 text-sm font-extrabold transition ${
                    selectedWatched
                      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                      : "border-white/10 bg-white/5 text-white/85 hover:bg-white/10"
                  }`}
                  onClick={toggleWatched}
                >
                  {selectedWatched
                    ? `✓ ${calendar.labels.watched}`
                    : calendar.labels.markWatched}
                </button>

                <button
                  className={`rounded-full px-5 py-2.5 text-sm font-extrabold transition ${
                    hasWatchUrl
                      ? "bg-emerald-500 text-[#06130B] hover:bg-emerald-400"
                      : "cursor-not-allowed bg-white/10 text-white/35"
                  }`}
                  onClick={() => {
                    console.log("[CalendarDebug] watch click", {
                      provider: selected?.service_name,
                      userId,
                      selectedUserId: selected?.user_id,
                      show_title: selected?.show_title,
                      episode_title: selected?.episode_title,
                      resolvedWatchLink,
                      watchUrl,
                      show_web_url: selected?.show_web_url,
                      service_web_url: selected?.service_web_url,
                      show_url_template: selected?.show_url_template,
                    });

                    if (watchUrl) {
                      window.open(watchUrl, "_blank", "noopener,noreferrer");
                    }
                  }}
                  disabled={!hasWatchUrl}
                  title={
                    hasWatchUrl ? watchLabel : calendar.modal.noValidWatchLink
                  }
                >
                  {watchLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}