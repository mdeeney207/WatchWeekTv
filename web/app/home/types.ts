import type { HomeCandidate } from "@/lib/home/types";
import type { FollowedShow, ProviderKey } from "@/lib/home/selectHero";

export type SelectableProviderKey = Exclude<ProviderKey, "Unknown">;

export type RecommendedItem = {
  id: string;
  title: string;
  posterUrl?: string;
  backdropUrl?: string;
  provider?: string | null;
  seedShowId?: string | null;
  seedShowTitle?: string | null;
  nextAirsAtISO?: string | null;
  type?: HomeCandidate["type"] | null;
  isScheduleVerified?: boolean | null;
};

export type UserUpcomingEpisodeRow = {
  user_id: string;
  episode_id: string | null;
  show_id: string | null;
  show_title: string | null;
  poster_path: string | null;
  poster_url: string | null;
  tmdb_id: number | null;
  episode_title: string | null;
  season: number | null;
  episode: number | null;
  air_date_utc: string | null;
  service_name: string | null;
  service_slug: string | null;
};

export type SafeHomeExperience = {
  hero: HomeCandidate | null;
  dropsTonight: HomeCandidate[];
  thisWeek: HomeCandidate[];
  comingSoon: HomeCandidate[];
  startingSoon: HomeCandidate[];
  becauseYouFollow: HomeCandidate[];
};

export type HeroViewModel = {
  title: string;
  description: string;
  badgeLabel: string;
  backgroundUrl?: string;
  posterUrl?: string;
  show: FollowedShow | null;
  date: Date | null;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
  mode: "calendar" | "followed" | "recommended" | "trending" | "default";
};

export type CandidateCardModel = {
  id: string;
  routeId: string | null;
  title: string;
  posterUrl?: string;
  backdropUrl?: string;
  provider: string;
  date: Date | null;
  candidate: HomeCandidate;
};

export const ALL_PROVIDERS: { key: SelectableProviderKey; label: string }[] = [
  { key: "Netflix", label: "Netflix" },
  { key: "Hulu", label: "Hulu" },
  { key: "Max", label: "Max" },
  { key: "Prime Video", label: "Prime Video" },
  { key: "Disney+", label: "Disney+" },
  { key: "Apple TV+", label: "Apple TV+" },
  { key: "Peacock", label: "Peacock" },
  { key: "Paramount+", label: "Paramount+" },
];

export const HERO_PROVIDER_SLUGS = [
  "netflix",
  "hulu",
  "max",
  "prime-video",
  "disney-plus",
  "apple-tv-plus",
] as const;

export const LS_PROVIDERS_BASE = "ww.providers.v1";
export const LS_FOLLOWED_BASE = "ww.followed.v1";