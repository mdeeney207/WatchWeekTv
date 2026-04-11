import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SportsCompetitionNav } from "@/components/sports/SportsCompetitionNav";
import { mapProviderKindToUi } from "@/lib/providers/mapProviderKindToUi";
import {
  getSportsEventById,
  type SportsWatchOptionRow,
} from "@/lib/sports/queries/getSportsEventById";

type PageProps = {
  params: Promise<{
    eventId: string;
  }>;
};

type NormalizedEventState = "LIVE" | "UPCOMING" | "COMPLETED";

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function formatEventDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(value));
}

function formatRelativeStart(
  startTimeUtc: string,
  eventState: NormalizedEventState
) {
  if (eventState === "LIVE") return "Live now";
  if (eventState === "COMPLETED") return "Final";

  const now = Date.now();
  const target = new Date(startTimeUtc).getTime();
  const diffMs = target - now;

  if (diffMs <= 0) return "Starting soon";

  const totalMinutes = Math.floor(diffMs / 1000 / 60);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `Starts in ${days}d ${hours}h`;
  if (hours > 0) return `Starts in ${hours}h ${minutes}m`;
  return `Starts in ${minutes}m`;
}

function uniqueBy<T>(items: T[], getKey: (item: T) => string) {
  const map = new Map<string, T>();

  for (const item of items) {
    const key = getKey(item);
    if (!map.has(key)) {
      map.set(key, item);
    }
  }

  return Array.from(map.values());
}

function getSupportingLine(row: SportsWatchOptionRow) {
  return [row.competition_name, row.round_label, row.season_label]
    .filter(Boolean)
    .join(" • ");
}

function getLocationLine(row: SportsWatchOptionRow) {
  return [row.venue_name, row.venue_city, row.venue_country]
    .filter(Boolean)
    .join(", ");
}

function getProviderLabel(row: SportsWatchOptionRow) {
  if (!row.provider_name) return null;
  if (!row.provider_kind) return row.provider_name;
  return `${row.provider_name} • ${mapProviderKindToUi(row.provider_kind)}`;
}

function isLiveStatus(status: string | null | undefined) {
  const normalized = normalizeText(status);
  return (
    normalized === "live" ||
    normalized === "in_progress" ||
    normalized === "ongoing" ||
    normalized === "in progress"
  );
}

function isCompletedStatus(status: string | null | undefined) {
  const normalized = normalizeText(status);
  return (
    normalized === "completed" ||
    normalized === "complete" ||
    normalized === "finished" ||
    normalized === "final" ||
    normalized === "ended"
  );
}

function isLiveAvailability(row: SportsWatchOptionRow) {
  const availabilityType = normalizeText(row.availability_type);

  return (
    row.is_live === true ||
    availabilityType === "live" ||
    availabilityType === "live_event" ||
    availabilityType === "livestream" ||
    availabilityType.includes("live")
  );
}

function isReplayAvailability(row: SportsWatchOptionRow) {
  const availabilityType = normalizeText(row.availability_type);

  return (
    availabilityType === "replay" ||
    availabilityType === "full_replay" ||
    availabilityType === "vod" ||
    availabilityType.includes("replay") ||
    availabilityType.includes("vod")
  );
}

function isHighlightAvailability(row: SportsWatchOptionRow) {
  const availabilityType = normalizeText(row.availability_type);

  return (
    availabilityType === "highlights" ||
    availabilityType === "highlight" ||
    availabilityType.includes("highlight") ||
    availabilityType.includes("clip")
  );
}

function getPrimaryExternalUrl(row: SportsWatchOptionRow) {
  return row.web_url ?? row.ios_url ?? row.android_url ?? null;
}

function dedupeWatchOptions(rows: SportsWatchOptionRow[]) {
  return uniqueBy(rows, (row) =>
    [
      row.provider_slug ?? row.provider_name ?? "unknown-provider",
      row.availability_type ?? "unknown-availability",
      row.language ?? "unknown-language",
      row.web_url ?? row.ios_url ?? row.android_url ?? "no-url",
    ].join("|")
  );
}

function normalizeEventState(rows: SportsWatchOptionRow[]): NormalizedEventState {
  const first = rows[0];
  const nowMs = Date.now();

  const explicitLive = isLiveStatus(first?.status);
  const hasLiveRowFlag = rows.some((row) => row.is_live === true);
  const hasLiveOption = rows.some((row) => isLiveAvailability(row));

  if (explicitLive || hasLiveRowFlag || hasLiveOption) {
    return "LIVE";
  }

  const startMs = new Date(first.start_time_utc).getTime();
  if (startMs > nowMs) {
    return "UPCOMING";
  }

  if (isCompletedStatus(first?.status)) {
    return "COMPLETED";
  }

  const endMs = first.end_time_utc ? new Date(first.end_time_utc).getTime() : null;
  if (endMs !== null && nowMs > endMs) {
    return "COMPLETED";
  }

  return "COMPLETED";
}

function TeamBadge({
  code,
  name,
  large = false,
}: {
  code?: string | null;
  name?: string | null;
  large?: boolean;
}) {
  if (!name) return null;

  return (
    <div
      className={classNames(
        "inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 text-white/90",
        large ? "px-4 py-2 text-sm" : "px-3 py-1 text-xs"
      )}
    >
      {code ? (
        <span
          className={classNames(
            "font-semibold uppercase tracking-wide text-white/70",
            large ? "text-[11px]" : "text-[10px]"
          )}
        >
          {code}
        </span>
      ) : null}
      <span className="truncate">{name}</span>
    </div>
  );
}

function StatusBadge({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "live" | "replay" | "highlights" | "neutral";
}) {
  const classes =
    tone === "live"
      ? "border-red-400/30 bg-red-500/10 text-red-300"
      : tone === "replay"
      ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-300"
      : tone === "highlights"
      ? "border-amber-400/25 bg-amber-500/10 text-amber-200"
      : "border-white/12 bg-white/5 text-white/75";

  return (
    <span
      className={classNames(
        "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
        classes
      )}
    >
      {children}
    </span>
  );
}

function WatchOptionCard({
  row,
  kind,
}: {
  row: SportsWatchOptionRow;
  kind: "live" | "replay" | "highlights";
}) {
  const providerLabel = getProviderLabel(row);
  const primaryUrl = getPrimaryExternalUrl(row);

  return (
    <article className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_12px_40px_rgba(0,0,0,0.22)]">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone={kind}>
          {kind === "live"
            ? "Live"
            : kind === "replay"
            ? "Replay"
            : "Highlights"}
        </StatusBadge>

        {row.language ? (
          <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-white/60">
            {row.language}
          </span>
        ) : null}

        {row.market ? (
          <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-white/60">
            {row.market}
          </span>
        ) : null}
      </div>

      <h3 className="mt-4 text-xl font-semibold tracking-tight text-white">
        {row.provider_name ?? "Watch option"}
      </h3>

      {providerLabel ? (
        <div className="mt-2 text-sm text-white/65">{providerLabel}</div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        {primaryUrl ? (
          <a
            href={primaryUrl}
            target="_blank"
            rel="noreferrer"
            className={classNames(
              "inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold transition",
              kind === "live"
                ? "bg-emerald-400 text-black hover:bg-emerald-300"
                : "border border-white/12 bg-white/6 text-white hover:bg-white/10"
            )}
          >
            {kind === "live"
              ? `Watch on ${row.provider_name ?? "Provider"}`
              : kind === "replay"
              ? "Open Replay"
              : "Open Highlights"}
          </a>
        ) : null}

        {row.ios_url && row.ios_url !== primaryUrl ? (
          <a
            href={row.ios_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-full border border-white/12 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            iPhone App
          </a>
        ) : null}

        {row.android_url && row.android_url !== primaryUrl ? (
          <a
            href={row.android_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center rounded-full border border-white/12 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Android App
          </a>
        ) : null}
      </div>

      {(row.available_from_utc || row.available_until_utc) && (
        <div className="mt-4 text-sm text-white/50">
          {row.available_from_utc ? (
            <div>Available from {formatEventDateTime(row.available_from_utc)}</div>
          ) : null}
          {row.available_until_utc ? (
            <div>Available until {formatEventDateTime(row.available_until_utc)}</div>
          ) : null}
        </div>
      )}
    </article>
  );
}

export default async function SportsEventPage({ params }: PageProps) {
  const { eventId } = await params;
  const rows = await getSportsEventById(eventId);

  if (!rows.length) {
    notFound();
  }

  const eventState = normalizeEventState(rows);

  const liveOptions =
    eventState === "LIVE"
      ? dedupeWatchOptions(rows.filter((row) => isLiveAvailability(row)))
      : [];

  const replayOptions =
    eventState === "COMPLETED"
      ? dedupeWatchOptions(rows.filter((row) => isReplayAvailability(row)))
      : [];

  const highlightOptions =
    eventState === "COMPLETED"
      ? dedupeWatchOptions(rows.filter((row) => isHighlightAvailability(row)))
      : [];

  const scopedPrimaryRow =
    (eventState === "LIVE"
      ? liveOptions.find((row) => row.is_primary) ?? liveOptions[0]
      : eventState === "COMPLETED"
      ? replayOptions.find((row) => row.is_primary) ??
        replayOptions[0] ??
        highlightOptions.find((row) => row.is_primary) ??
        highlightOptions[0]
      : rows.find((row) => row.is_primary) ?? rows[0]) ??
    rows.find((row) => row.is_primary) ??
    rows[0];

  const primaryProviderLabel = getProviderLabel(scopedPrimaryRow);
  const supportingLine = getSupportingLine(scopedPrimaryRow);
  const locationLine = getLocationLine(scopedPrimaryRow);

  const isLive = eventState === "LIVE";
  const isCompleted = eventState === "COMPLETED";
  const isUpcoming = eventState === "UPCOMING";

  return (
    <main className="min-h-screen bg-[#050B12] text-white">
      <div className="mx-auto max-w-[1440px] px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href="/sports"
            className="inline-flex items-center rounded-full border border-white/12 bg-white/5 px-4 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/10"
          >
            ← Back to Sports
          </Link>
        </div>

        <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.07),rgba(255,255,255,0.02))] px-8 py-12 shadow-[0_25px_80px_rgba(0,0,0,0.40)] sm:px-10 sm:py-14">
          <div className="max-w-5xl">
            <div className="flex flex-wrap items-center gap-2">
              {isLive ? <StatusBadge tone="live">Live</StatusBadge> : null}
              {isCompleted && replayOptions.length > 0 ? (
                <StatusBadge tone="replay">Replay</StatusBadge>
              ) : null}
              {isCompleted && highlightOptions.length > 0 ? (
                <StatusBadge tone="highlights">Highlights</StatusBadge>
              ) : null}
              {isUpcoming ? (
                <StatusBadge tone="neutral">Upcoming</StatusBadge>
              ) : null}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <TeamBadge code={null} name={scopedPrimaryRow.home_competitor} large />
              <span className="text-sm uppercase tracking-[0.24em] text-white/35">
                vs
              </span>
              <TeamBadge code={null} name={scopedPrimaryRow.away_competitor} large />
            </div>

            <h1 className="mt-6 max-w-5xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
              {scopedPrimaryRow.event_label ?? "Sports Event"}
            </h1>

            {supportingLine ? (
              <div className="mt-5 text-base text-white/68 sm:text-lg">
                {supportingLine}
              </div>
            ) : null}

            <div className="mt-5 text-base text-white/92 sm:text-lg">
              {formatEventDateTime(scopedPrimaryRow.start_time_utc)}
            </div>

            <div
              className={classNames(
                "mt-3 text-sm sm:text-base",
                isLive
                  ? "text-red-300"
                  : isCompleted
                  ? "text-white/65"
                  : "text-emerald-300"
              )}
            >
              {formatRelativeStart(scopedPrimaryRow.start_time_utc, eventState)}
            </div>

            {locationLine ? (
              <div className="mt-5 text-sm text-white/58 sm:text-base">
                {locationLine}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center gap-2">
              {primaryProviderLabel ? (
                <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-white/80">
                  {primaryProviderLabel}
                </span>
              ) : null}

              {scopedPrimaryRow.event_type ? (
                <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs uppercase tracking-[0.14em] text-white/65">
                  {scopedPrimaryRow.event_type}
                </span>
              ) : null}

              {scopedPrimaryRow.sport_name ? (
                <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs text-white/65">
                  {scopedPrimaryRow.sport_name}
                </span>
              ) : null}
            </div>

            <div className="mt-9 flex flex-wrap gap-3">
              {isLive &&
              liveOptions[0] &&
              getPrimaryExternalUrl(liveOptions[0]) ? (
                <a
                  href={getPrimaryExternalUrl(liveOptions[0])!}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-emerald-300"
                >
                  Watch Live
                </a>
              ) : null}

              {isCompleted &&
              replayOptions[0] &&
              getPrimaryExternalUrl(replayOptions[0]) ? (
                <a
                  href={getPrimaryExternalUrl(replayOptions[0])!}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-full bg-emerald-400 px-5 py-3 text-sm font-semibold text-black transition hover:bg-emerald-300"
                >
                  Watch Replay
                </a>
              ) : null}

              {isCompleted &&
              highlightOptions[0] &&
              getPrimaryExternalUrl(highlightOptions[0]) ? (
                <a
                  href={getPrimaryExternalUrl(highlightOptions[0])!}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-full border border-white/12 bg-white/6 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Watch Highlights
                </a>
              ) : null}

              {isUpcoming && scopedPrimaryRow.web_url ? (
                <a
                  href={scopedPrimaryRow.web_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-full border border-white/12 bg-white/6 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Open {scopedPrimaryRow.provider_name ?? "Provider"}
                </a>
              ) : null}
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-r from-white/[0.05] to-white/[0.03] px-4 py-4 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
            <SportsCompetitionNav />
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[28px] border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.03] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)] sm:p-8">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
              Event Details
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[22px] border border-white/8 bg-black/20 p-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">
                  Competition
                </div>
                <div className="mt-3 text-lg font-semibold text-white">
                  {scopedPrimaryRow.competition_name ?? "Unknown competition"}
                </div>
                {scopedPrimaryRow.round_label ? (
                  <div className="mt-2 text-sm text-white/60">
                    {scopedPrimaryRow.round_label}
                  </div>
                ) : null}
              </div>

              <div className="rounded-[22px] border border-white/8 bg-black/20 p-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">
                  Season
                </div>
                <div className="mt-3 text-lg font-semibold text-white">
                  {scopedPrimaryRow.season_label ?? "Not set"}
                </div>
                {scopedPrimaryRow.event_type ? (
                  <div className="mt-2 text-sm text-white/60">
                    {scopedPrimaryRow.event_type}
                  </div>
                ) : null}
              </div>

              <div className="rounded-[22px] border border-white/8 bg-black/20 p-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">
                  Kickoff
                </div>
                <div className="mt-3 text-lg font-semibold text-white">
                  {formatEventDateTime(scopedPrimaryRow.start_time_utc)}
                </div>
                <div
                  className={classNames(
                    "mt-2 text-sm",
                    isLive
                      ? "text-red-300"
                      : isCompleted
                      ? "text-white/65"
                      : "text-emerald-300"
                  )}
                >
                  {formatRelativeStart(scopedPrimaryRow.start_time_utc, eventState)}
                </div>
              </div>

              <div className="rounded-[22px] border border-white/8 bg-black/20 p-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">
                  Venue
                </div>
                <div className="mt-3 text-lg font-semibold text-white">
                  {scopedPrimaryRow.venue_name ?? "Venue pending"}
                </div>
                <div className="mt-2 text-sm text-white/60">
                  {[scopedPrimaryRow.venue_city, scopedPrimaryRow.venue_country]
                    .filter(Boolean)
                    .join(", ") || "Location pending"}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.03] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)] sm:p-8">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
              Matchup
            </div>

            <div className="mt-6 rounded-[24px] border border-white/8 bg-black/20 p-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-4 rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-4">
                  <div className="text-base font-semibold text-white">
                    {scopedPrimaryRow.home_competitor ?? "Home"}
                  </div>
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Home
                  </div>
                </div>

                <div className="text-center text-xs uppercase tracking-[0.24em] text-white/35">
                  vs
                </div>

                <div className="flex items-center justify-between gap-4 rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-4">
                  <div className="text-base font-semibold text-white">
                    {scopedPrimaryRow.away_competitor ?? "Away"}
                  </div>
                  <div className="text-xs uppercase tracking-[0.18em] text-white/35">
                    Away
                  </div>
                </div>
              </div>

              {primaryProviderLabel ? (
                <div className="mt-6 text-sm text-white/60">
                  Primary watch option: {primaryProviderLabel}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[28px] border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.03] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)] sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
                Watch
              </div>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-[2rem]">
                Where to watch
              </h2>
            </div>

            <div className="text-sm text-white/45">
              {rows.length} provider option{rows.length === 1 ? "" : "s"}
            </div>
          </div>

          {isUpcoming ? (
            <div className="mt-6 rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] px-5 py-10 text-center text-white/60">
              Watch options will become actionable as the live window opens or
              replay/highlights become available after the event ends.
            </div>
          ) : null}

          {isLive && liveOptions.length > 0 ? (
            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              {liveOptions.map((row) => (
                <WatchOptionCard
                  key={[
                    row.provider_slug ?? row.provider_name ?? "provider",
                    row.availability_type ?? "live",
                    row.language ?? "lang",
                  ].join("|")}
                  row={row}
                  kind="live"
                />
              ))}
            </div>
          ) : null}

          {isCompleted && replayOptions.length > 0 ? (
            <div className="mt-6">
              <div className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-white/45">
                Replay
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                {replayOptions.map((row) => (
                  <WatchOptionCard
                    key={[
                      row.provider_slug ?? row.provider_name ?? "provider",
                      row.availability_type ?? "replay",
                      row.language ?? "lang",
                    ].join("|")}
                    row={row}
                    kind="replay"
                  />
                ))}
              </div>
            </div>
          ) : null}

          {isCompleted && highlightOptions.length > 0 ? (
            <div className="mt-8">
              <div className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-white/45">
                Highlights
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                {highlightOptions.map((row) => (
                  <WatchOptionCard
                    key={[
                      row.provider_slug ?? row.provider_name ?? "provider",
                      row.availability_type ?? "highlights",
                      row.language ?? "lang",
                    ].join("|")}
                    row={row}
                    kind="highlights"
                  />
                ))}
              </div>
            </div>
          ) : null}

          {isLive && liveOptions.length === 0 ? (
            <div className="mt-6 rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] px-5 py-10 text-center text-white/60">
              This event is marked live, but no live watch links are currently
              available.
            </div>
          ) : null}

          {isCompleted &&
          replayOptions.length === 0 &&
          highlightOptions.length === 0 ? (
            <div className="mt-6 rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] px-5 py-10 text-center text-white/60">
              This event has finished, but replay or highlight options are not
              available yet.
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}