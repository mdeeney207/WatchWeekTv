/**
 * Canonical normalized sports event state used across sports hub surfaces.
 *
 * IMPORTANT:
 * This is the only event-state contract UI should depend on.
 * Raw upstream provider/feed statuses must be normalized before reaching
 * SportsCardItem or page components.
 */
export type SportsEventState = "LIVE" | "UPCOMING" | "COMPLETED";

/**
 * Normalized sports event card contract used by the Sports hub UI.
 *
 * PURPOSE:
 * This type is the shared presentation model for sports discovery surfaces,
 * especially:
 * - /sports page rails
 * - featured sports hero
 * - future related matches rails
 * - future competition landing pages
 *
 * DESIGN RULE:
 * This is a UI-facing normalized type, not a raw database row type.
 * Query files should transform Supabase/database results into this shape
 * before passing data into page/components.
 *
 * IMPORTANT:
 * Keep this type stable. UI components should depend on this normalized
 * contract rather than database schema details.
 */
export type SportsCardItem = {
  /**
   * Stable event identifier from the sports events layer.
   * Used for React keys and detail page routing.
   */
  id: string;

  /**
   * Internal WatchWeek route to the event detail page.
   *
   * EXAMPLE:
   * /sports/<eventId>
   *
   * NOTE:
   * This is intentionally the app route, not a third-party watch URL.
   * Provider deep links should remain separate fields if/when needed.
   */
  href: string;

  /**
   * Human-readable event label.
   *
   * EXAMPLES:
   * - United States vs Mexico
   * - Monaco Grand Prix
   * - UFC 320: Main Card
   *
   * NOTE:
   * UI may still prefer homeCompetitor/awayCompetitor for matchup rendering
   * when both are present.
   */
  eventLabel: string;

  /**
   * Competition display name.
   *
   * EXAMPLES:
   * - FIFA World Cup
   * - NFL
   * - Formula 1
   */
  competitionName: string | null;

  /**
   * Competition slug used for routing/filtering if needed later.
   *
   * EXAMPLES:
   * - fifa-world-cup
   * - nfl
   * - formula-1
   */
  competitionSlug: string | null;

  /**
   * Higher-level sport taxonomy key.
   *
   * EXAMPLES:
   * - soccer
   * - football
   * - basketball
   * - tennis
   *
   * NOTE:
   * Useful for global grouping when competitionSlug is too specific.
   */
  sportKey: string | null;

  /**
   * Season label for display.
   *
   * EXAMPLES:
   * - 2026
   * - 2025–26
   */
  seasonLabel: string | null;

  /**
   * Round/matchday/stage label for display.
   *
   * EXAMPLES:
   * - Matchday 1
   * - Quarterfinal
   * - Round of 16
   * - Main Card
   */
  roundLabel: string | null;

  /**
   * Canonical UTC start time for the event.
   *
   * REQUIRED:
   * All hub rail logic depends on this being present and valid.
   */
  startTimeUtc: string;

  /**
   * Canonical UTC end time when known.
   *
   * NOTE:
   * Nullable because many sports feeds may omit or estimate this.
   * Useful later for live-window reasoning and event timeline detail.
   */
  endTimeUtc: string | null;

  /**
   * Canonical normalized event state.
   *
   * IMPORTANT:
   * This is NOT a raw feed/provider status string.
   * It must be normalized before reaching UI.
   */
  status: SportsEventState;

  /**
   * Competitor/team display names.
   *
   * NOTE:
   * Nullable so this model also supports events that are not classic
   * two-sided team matchups, such as:
   * - racing
   * - tournaments
   * - cards/fight events
   */
  homeCompetitor: string | null;
  awayCompetitor: string | null;

  /**
   * Venue display metadata.
   *
   * NOTE:
   * These are intentionally separate so UI can compose:
   * - venue only
   * - city + country
   * - full location line
   */
  venueName: string | null;
  venueCity: string | null;
  venueCountry: string | null;

  /**
   * Primary watch provider metadata for the event.
   *
   * This should represent the best/default provider to show in compact
   * surfaces such as cards and hero chips.
   *
   * NOTE:
   * This does NOT replace full watch options on the event detail page.
   */
  primaryProviderName: string | null;
  primaryProviderSlug: string | null;
  primaryProviderLogoUrl: string | null;
  primaryProviderKind: string | null;

  /**
   * Capability flags for watch option availability.
   *
   * These drive card badges, hero chips, and rail logic.
   *
   * HARD RULES:
   * - LIVE       -> hasLiveWatchOptions may be true; replay/highlights false
   * - UPCOMING   -> all false
   * - COMPLETED  -> replay/highlights may be true; live false
   *
   * IMPORTANT:
   * These are normalized booleans and should be computed in the query layer,
   * not in UI components.
   */
  hasLiveWatchOptions: boolean;
  hasReplayOptions: boolean;
  hasHighlightOptions: boolean;
};

/**
 * Normalized server result for the /sports hub page.
 *
 * RAIL DEFINITIONS:
 * - liveNow: live events only
 * - startingSoon: events beginning within the near-term window
 * - today: remaining upcoming events scheduled later today
 * - thisWeek: future events after today within the weekly window
 *
 * IMPORTANT:
 * Rails should now be non-overlapping.
 *
 * CURRENT PAGE RULE:
 * If only thisWeek has items and the other rails are empty, the UI may relabel
 * "This Week" to "Coming Up" for a more natural reading experience.
 */
export type SportsHubRails = {
  liveNow: SportsCardItem[];
  startingSoon: SportsCardItem[];
  today: SportsCardItem[];
  thisWeek: SportsCardItem[];
};