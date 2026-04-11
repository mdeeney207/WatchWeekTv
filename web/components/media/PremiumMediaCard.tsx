import Link from "next/link";
import Image from "next/image";
import * as React from "react";

import CountdownPill from "@/components/ui/CountdownPill";
import LiveIndicator from "@/components/ui/LiveIndicator";
import ProviderBadge from "@/components/ui/ProviderBadge";

export type PremiumMediaCardBadge = {
  label: string;
  tone?: "default" | "live" | "success" | "warning";
};

export type PremiumMediaCardTeam = {
  name: string;
  shortName?: string | null;
  flag?: string | null;
};

type PremiumMediaCardProps = {
  href?: string;
  imageUrl?: string | null;
  imageAlt?: string | null;

  title: string;
  subtitle?: string | null;
  meta?: string | null;
  kicker?: string | null;
  supportingText?: string | null;

  status?: string | null;
  live?: boolean;
  startTimeUtc?: string | null;

  badges?: PremiumMediaCardBadge[];
  providerName?: string | null;
  providerKind?: string | null;

  homeTeam?: PremiumMediaCardTeam | null;
  awayTeam?: PremiumMediaCardTeam | null;

  venueName?: string | null;
  venueLocation?: string | null;

  ctaLabel?: string | null;
  dense?: boolean;
  priority?: boolean;
  className?: string;
};

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function formatDateTime(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

function Badge({
  label,
  tone = "default",
}: {
  label: string;
  tone?: PremiumMediaCardBadge["tone"];
}) {
  const toneClasses =
    tone === "live"
      ? "border-red-400/25 bg-red-500/12 text-red-100"
      : tone === "success"
        ? "border-emerald-400/25 bg-emerald-500/12 text-emerald-100"
        : tone === "warning"
          ? "border-amber-400/25 bg-amber-500/12 text-amber-100"
          : "border-white/12 bg-white/7 text-white/78";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-[0.14em]",
        toneClasses,
      )}
    >
      {label}
    </span>
  );
}

function TeamPill({ team }: { team: PremiumMediaCardTeam }) {
  const label = team.shortName?.trim() || team.name;

  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/12 bg-black/30 px-2.5 py-1 text-[11px] font-medium text-white/88 backdrop-blur-sm">
      {team.flag ? <span>{team.flag}</span> : null}
      <span className="truncate">{label}</span>
    </span>
  );
}

function Content({
  title,
  subtitle,
  meta,
  kicker,
  supportingText,
  live,
  startTimeUtc,
  badges,
  providerName,
  providerKind,
  homeTeam,
  awayTeam,
  venueName,
  venueLocation,
  ctaLabel,
  dense,
}: Omit<
  PremiumMediaCardProps,
  "href" | "imageUrl" | "imageAlt" | "priority" | "className" | "status"
>) {
  const formattedDateTime = formatDateTime(startTimeUtc);
  const hasTeams = Boolean(homeTeam || awayTeam);

  const locationLine =
    [venueName, venueLocation].filter(Boolean).join(" · ") || null;

  const timingLine = meta?.trim() || formattedDateTime || null;
  const secondaryLine =
    supportingText?.trim() || (!supportingText ? locationLine : null);

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", dense ? "p-3" : "p-4")}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {live ? <LiveIndicator /> : null}
        {!live && startTimeUtc ? <CountdownPill startTimeUtc={startTimeUtc} compact /> : null}
        {badges?.map((badge) => (
          <Badge
            key={`${badge.label}-${badge.tone ?? "default"}`}
            label={badge.label}
            tone={badge.tone}
          />
        ))}
      </div>

      {kicker ? (
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
          {kicker}
        </div>
      ) : null}

      {hasTeams ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {homeTeam ? <TeamPill team={homeTeam} /> : null}
          {awayTeam ? <TeamPill team={awayTeam} /> : null}
        </div>
      ) : null}

      <div className="space-y-1.5">
        <h3
          className={cn(
            "line-clamp-2 font-semibold tracking-tight text-white",
            dense ? "text-[15px] leading-5" : "text-[17px] leading-6",
          )}
        >
          {title}
        </h3>

        {subtitle ? (
          <p className="line-clamp-2 text-sm leading-5 text-white/68">{subtitle}</p>
        ) : null}

        {timingLine ? (
          <p className="text-sm font-medium text-white/88">{timingLine}</p>
        ) : null}

        {secondaryLine ? (
          <p className="line-clamp-2 text-sm text-white/55">{secondaryLine}</p>
        ) : null}
      </div>

      <div className="mt-auto flex items-end justify-between gap-3 pt-4">
        <ProviderBadge name={providerName} kind={providerKind} />

        {ctaLabel ? (
          <span className="inline-flex shrink-0 items-center rounded-full border border-white/14 bg-white/8 px-3 py-1.5 text-[11px] font-semibold text-white/88 transition hover:bg-white/12">
            {ctaLabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function PremiumMediaCard({
  href,
  imageUrl,
  imageAlt,
  title,
  subtitle,
  meta,
  kicker,
  supportingText,
  status,
  live = false,
  startTimeUtc,
  badges,
  providerName,
  providerKind,
  homeTeam,
  awayTeam,
  venueName,
  venueLocation,
  ctaLabel,
  dense = false,
  priority = false,
  className,
}: PremiumMediaCardProps) {
  const hasMedia = Boolean(imageUrl);

  const rootClassName = cn(
    "group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] shadow-[0_10px_40px_rgba(0,0,0,0.28)] transition duration-300",
    "hover:-translate-y-0.5 hover:border-white/16 hover:bg-white/[0.06]",
    className,
  );

  const mergedBadges = React.useMemo<PremiumMediaCardBadge[]>(() => {
    const result = [...(badges ?? [])];

    if (status?.trim()) {
      const normalized = status.trim().toUpperCase();

      if (!result.some((item) => item.label.toUpperCase() === normalized)) {
        result.unshift({
          label: normalized,
          tone:
            normalized === "LIVE"
              ? "live"
              : normalized === "REPLAY"
                ? "success"
                : normalized === "HIGHLIGHTS"
                  ? "warning"
                  : "default",
        });
      }
    }

    return result;
  }, [badges, status]);

  const inner = (
    <>
      {hasMedia ? (
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-white/5">
          <Image
            src={imageUrl!}
            alt={imageAlt ?? title}
            fill
            priority={priority}
            className="object-cover transition duration-500 group-hover:scale-[1.02]"
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#071019] via-[#071019]/55 to-black/10" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/18 via-transparent to-transparent" />
        </div>
      ) : null}

      <Content
        title={title}
        subtitle={subtitle}
        meta={meta}
        kicker={kicker}
        supportingText={supportingText}
        live={live}
        startTimeUtc={startTimeUtc}
        badges={mergedBadges}
        providerName={providerName}
        providerKind={providerKind}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        venueName={venueName}
        venueLocation={venueLocation}
        ctaLabel={ctaLabel}
        dense={dense}
      />
    </>
  );

  if (href) {
    return (
      <Link href={href} className={rootClassName}>
        {inner}
      </Link>
    );
  }

  return <article className={rootClassName}>{inner}</article>;
}

export default PremiumMediaCard;