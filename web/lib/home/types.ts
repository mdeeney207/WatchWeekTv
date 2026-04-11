export type CandidateType = "show" | "episode" | "movie" | "sports_event";

export type ReleaseStatus =
  | "live_now"
  | "starting_soon"
  | "tonight"
  | "tomorrow"
  | "this_week"
  | "upcoming"
  | "recently_dropped";

export type CandidateRelationship =
  | "followed"
  | "recommended"
  | "trending"
  | "provider_affinity"
  | "editorial";

export type CandidateReason =
  | "because_you_follow"
  | "similar_to_followed"
  | "trending_now"
  | "new_release"
  | "live_event"
  | "team_followed"
  | "tournament_followed"
  | "editorial_pick";

export type RailHint =
  | "hero"
  | "continue_watching"
  | "starting_soon"
  | "tonight_picks"
  | "because_you_follow"
  | "trending"
  | "coming_this_week"
  | "coming_soon"
  | "sports_live"
  | "sports_upcoming";

export type HomeCandidateMetaValue =
  | string
  | number
  | boolean
  | null
  | undefined;

export type HomeCandidate = {
  id: string;
  type: CandidateType;

  title: string;
  subtitle?: string;

  posterUrl?: string;
  backdropUrl?: string;

  provider?: string | null;
  providerSlug?: string | null;

  /**
   * releaseAt is only for true time-aware releases.
   * For date-only releases, this should normally be null and the pipeline
   * should use meta.releaseDayKey instead.
   */
  releaseAt?: string | null;
  releaseStatus: ReleaseStatus;

  relationship?: CandidateRelationship;
  reason?: CandidateReason;
  source: string;

  railHint?: RailHint;
  sourceRailHints?: RailHint[];

  urgencyScore?: number;
  relevanceScore?: number;
  freshnessScore?: number;
  providerScore?: number;
  priorityScore?: number;
  finalScore?: number;

  tmdbId?: number | null;
  showId?: string | null;
  episodeId?: string | null;

  seedShowId?: string | null;
  seedShowTitle?: string | null;

  sport?: string | null;
  leagueId?: string | null;
  leagueName?: string | null;
  tournamentId?: string | null;
  tournamentName?: string | null;
  homeTeamId?: string | null;
  homeTeamName?: string | null;
  awayTeamId?: string | null;
  awayTeamName?: string | null;

  meta?: {
    /**
     * Verified calendar-day truth exists.
     * Example: 2026-04-09 is known even if no exact release time is known.
     */
    isDayVerified?: boolean;

    /**
     * Verified exact time exists and releaseAt is meaningful as a precise moment.
     */
    isTimeVerified?: boolean;

    /**
     * Stable YYYY-MM-DD key used for date-only grouping and rail bucketing.
     */
    releaseDayKey?: string | null;

    /**
     * True when the source release is day-only and should not be treated as a
     * precise local timestamp.
     */
    isDateOnly?: boolean;

    /**
     * Original source value before normalization, useful for debugging.
     */
    originalReleaseAt?: string | null;

    [key: string]: HomeCandidateMetaValue;
  };
};

export type HomeExperience = {
  hero: HomeCandidate | null;

  startingSoon: HomeCandidate[];
  tonightPicks: HomeCandidate[];
  becauseYouFollow: HomeCandidate[];
  comingThisWeek: HomeCandidate[];
  comingSoon: HomeCandidate[];

  dropsTonight: HomeCandidate[];
  thisWeek: HomeCandidate[];
};