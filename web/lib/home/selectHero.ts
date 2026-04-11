import {
  getUsableImageUrl,
  resolveShowArtwork,
} from "@/lib/home/resolveArtwork";

export type ProviderKey =
  | "Netflix"
  | "Hulu"
  | "Max"
  | "Prime Video"
  | "Disney+"
  | "Apple TV+"
  | "Peacock"
  | "Paramount+"
  | "Streaming";

export type FollowedShow = {
  id: string;
  title: string;
  provider: ProviderKey;
  posterUrl?: string;
  backdropUrl?: string;
  nextAirsAtISO?: string;
  tmdbId?: number | null;
  scheduleSource?: "verified";
};

export type TrendingItem = {
  id: string | number;
  title: string;
  posterUrl?: string;
  backdropUrl?: string;
};

export type EpisodeScheduleRow = {
  id: string;
  showId: string;
  episodeId?: string | null;
  tmdbId?: number | null;
  showTitle: string;
  episodeTitle?: string | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  provider?: string | null;
  providerSlug?: string | null;
  airDateISO: string;
  posterUrl?: string;
  backdropUrl?: string;
};

export type HeroMode = "calendar" | "followed" | "trending" | "default";

export type HeroSelection = {
  mode: HeroMode;
  title: string;
  description: string;
  badgeLabel: string;
  show: FollowedShow | null;
  date: Date | null;
  backgroundUrl: string | null;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
};

export type SelectHeroInput = {
  isLoggedIn: boolean;
  episodeRows: EpisodeScheduleRow[];
  followed: FollowedShow[];
  trendingPool: TrendingItem[];
};

function isValidIsoDate(value?: string | null) {
  if (!value) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
}

export function toProviderKey(name?: string | null): ProviderKey {
  const value = String(name ?? "").trim().toLowerCase();

  switch (value) {
    case "netflix":
      return "Netflix";
    case "hulu":
      return "Hulu";
    case "max":
    case "hbo max":
      return "Max";
    case "prime video":
    case "amazon prime video":
    case "amazon video":
      return "Prime Video";
    case "disney+":
    case "disney plus":
      return "Disney+";
    case "apple tv+":
    case "apple tv plus":
      return "Apple TV+";
    case "peacock":
    case "peacock premium":
      return "Peacock";
    case "paramount+":
    case "paramount plus":
      return "Paramount+";
    default:
      return "Streaming";
  }
}

function buildCalendarHeroSelection(
  row: EpisodeScheduleRow,
  followed: FollowedShow[]
): HeroSelection {
  const date = new Date(row.airDateISO);

  const matchedShow = resolveShowArtwork(
    {
      id: row.showId,
      tmdbId: row.tmdbId ?? null,
      title: row.showTitle,
      provider: toProviderKey(row.provider ?? row.providerSlug),
      posterUrl: row.posterUrl,
      backdropUrl: row.backdropUrl,
      nextAirsAtISO: row.airDateISO,
      scheduleSource: "verified",
    },
    followed
  );

  const episodeMeta =
    row.seasonNumber != null && row.episodeNumber != null
      ? `S${String(row.seasonNumber).padStart(2, "0")}E${String(
          row.episodeNumber
        ).padStart(2, "0")}`
      : null;

  return {
    mode: "calendar",
    badgeLabel: "NEXT ON YOUR CALENDAR",
    title: row.showTitle,
    description: row.episodeTitle
      ? `${row.episodeTitle}${
          episodeMeta ? ` • ${episodeMeta}` : ""
        }. This is the next confirmed release on your calendar.`
      : "This is the next confirmed release on your calendar.",
    show: matchedShow,
    date,
    backgroundUrl:
      getUsableImageUrl(row.backdropUrl, row.posterUrl) ??
      getUsableImageUrl(matchedShow?.backdropUrl, matchedShow?.posterUrl),
    primaryLabel: "View details",
    primaryHref: `/tv/${row.tmdbId ?? row.showId}`,
    secondaryLabel: "Open calendar",
    secondaryHref: "/calendar",
  };
}

function buildFollowedHeroSelection(
  show: FollowedShow,
  date?: Date | null
): HeroSelection {
  return {
    mode: "followed",
    badgeLabel: "UP NEXT",
    title: show.title,
    description:
      "Your next verified followed release is already on deck.",
    show,
    date: date ?? (show.nextAirsAtISO ? new Date(show.nextAirsAtISO) : null),
    backgroundUrl: getUsableImageUrl(show.backdropUrl, show.posterUrl),
    primaryLabel: "View details",
    primaryHref: `/tv/${show.tmdbId ?? show.id}`,
    secondaryLabel: "Open calendar",
    secondaryHref: "/calendar",
  };
}

function buildTrendingHeroSelection(
  item: TrendingItem,
  isLoggedIn: boolean
): HeroSelection {
  return {
    mode: "trending",
    badgeLabel: "TRENDING NOW",
    title: item.title,
    description: isLoggedIn
      ? "No verified tracked release is available yet, so WatchWeek is showing a strong discovery pick."
      : "Track shows, build your calendar, and turn WatchWeek into your command center for what matters next.",
    show: null,
    date: null,
    backgroundUrl: getUsableImageUrl(item.backdropUrl, item.posterUrl),
    primaryLabel: isLoggedIn ? "Browse shows" : "Create free account",
    primaryHref: isLoggedIn ? "/tv" : "/login",
    secondaryLabel: "Open calendar",
    secondaryHref: "/calendar",
  };
}

function buildDefaultHeroSelection(isLoggedIn: boolean): HeroSelection {
  return {
    mode: "default",
    badgeLabel: "WATCHWEEK",
    title: "Never miss what drops next.",
    description:
      "A premium streaming calendar built for urgency, discovery, and real upcoming releases.",
    show: null,
    date: null,
    backgroundUrl: null,
    primaryLabel: isLoggedIn ? "Browse shows" : "Create free account",
    primaryHref: isLoggedIn ? "/tv" : "/login",
    secondaryLabel: "Open calendar",
    secondaryHref: "/calendar",
  };
}

export function selectHero({
  isLoggedIn,
  episodeRows,
  followed,
  trendingPool,
}: SelectHeroInput): HeroSelection {
  const now = Date.now();

  const calendarHeroRow =
    episodeRows
      .filter((row) => isValidIsoDate(row.airDateISO))
      .sort(
        (a, b) =>
          new Date(a.airDateISO).getTime() - new Date(b.airDateISO).getTime()
      )
      .find((row) => new Date(row.airDateISO).getTime() > now) ?? null;

  if (calendarHeroRow) {
    return buildCalendarHeroSelection(calendarHeroRow, followed);
  }

  const nextFollowed =
    followed
      .map((show) => ({
        show,
        date:
          show.scheduleSource === "verified" && isValidIsoDate(show.nextAirsAtISO)
            ? new Date(show.nextAirsAtISO)
            : null,
      }))
      .filter(
        (item): item is { show: FollowedShow; date: Date } =>
          item.date instanceof Date &&
          !Number.isNaN(item.date.getTime()) &&
          item.date.getTime() > now
      )
      .sort((a, b) => a.date.getTime() - b.date.getTime())[0] ?? null;

  if (nextFollowed) {
    const resolvedShow = resolveShowArtwork(nextFollowed.show, followed);

    if (resolvedShow) {
      return buildFollowedHeroSelection(
        {
          ...resolvedShow,
          nextAirsAtISO: nextFollowed.date.toISOString(),
          scheduleSource: "verified",
        },
        nextFollowed.date
      );
    }
  }

  const trendingWithImage =
    trendingPool.find((item) =>
      Boolean(getUsableImageUrl(item.backdropUrl, item.posterUrl))
    ) ?? null;

  if (trendingWithImage) {
    return buildTrendingHeroSelection(trendingWithImage, isLoggedIn);
  }

  return buildDefaultHeroSelection(isLoggedIn);
}