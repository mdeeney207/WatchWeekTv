/**
 * Raw normalized event shape produced by any upstream sports ingestion adapter.
 *
 * PURPOSE:
 * Each source adapter (ESPN, Sportradar, FIFA, Olympics, etc.) should map its
 * native payload into this contract first before any database upsert or
 * downstream WatchWeek normalization happens.
 *
 * DESIGN RULE:
 * This is an ingestion-layer contract, not a UI contract.
 * It should be source-friendly, stable, and explicit enough to support:
 * - event storage
 * - provider storage
 * - venue storage
 * - competition taxonomy
 * - future reconciliation/deduping
 */

export type SourceSportsEventStatus =
  | "scheduled"
  | "live"
  | "completed"
  | "postponed"
  | "cancelled"
  | "suspended"
  | "delayed"
  | "unknown";

export type SourceSportsParticipant = {
  /**
   * Stable source-side participant identifier when available.
   *
   * EXAMPLES:
   * - espn:team:123
   * - sportradar:competitor:abc
   */
  source_participant_id?: string;

  /**
   * Display name exactly or near-exactly as supplied by source.
   */
  name: string;

  /**
   * Optional short name / abbreviation.
   *
   * EXAMPLES:
   * - USA
   * - MEX
   * - BOS
   */
  short_name?: string;

  /**
   * Participant role within event.
   *
   * NOTE:
   * Keep this flexible enough for team-vs-team, fighter cards, racing grids,
   * tournament entries, etc.
   */
  role?: "home" | "away" | "competitor" | "participant";

  /**
   * Optional ranking/seed/position metadata from source.
   */
  seed_or_rank?: string;
};

export type SourceSportsVenue = {
  name?: string;
  city?: string;
  state_or_region?: string;
  country?: string;
  country_code?: string;
  timezone?: string;
};

export type SourceSportsBroadcast = {
  /**
   * Source-facing provider/broadcaster label.
   *
   * EXAMPLES:
   * - FOX
   * - ESPN+
   * - Peacock
   * - BBC One
   */
  provider_name: string;

  /**
   * Optional upstream/provider slug if known at ingest time.
   */
  provider_slug?: string;

  /**
   * Broad availability bucket from source.
   *
   * NOTE:
   * This is still source-facing. Later mapping can convert this into WatchWeek
   * provider relationships / availability types.
   */
  availability_type?: "live_event" | "replay" | "highlight" | "unknown";

  /**
   * Whether source marks this as the preferred/default watch option.
   */
  is_primary?: boolean;

  /**
   * Region/language metadata from source if present.
   */
  market?: string;
  language?: string;

  /**
   * Optional deep links carried from source.
   */
  web_url?: string;
  ios_url?: string;
  android_url?: string;
};

export type SourceSportsEvent = {
  /**
   * Source system identifier.
   *
   * EXAMPLES:
   * - espn
   * - sportradar
   * - fifa
   * - olympics
   */
  source: string;

  /**
   * Stable event identifier from the source system.
   */
  source_event_id: string;

  /**
   * Higher-level normalized sport label from the source adapter.
   *
   * EXAMPLES:
   * - soccer
   * - football
   * - basketball
   * - mma
   * - formula-1
   */
  sport: string;

  /**
   * Competition/tournament/league display name.
   *
   * EXAMPLES:
   * - FIFA World Cup
   * - NFL
   * - UEFA Champions League
   */
  competition: string;

  /**
   * Optional source competition identifier.
   */
  source_competition_id?: string;

  /**
   * Optional competition slug candidate from adapter.
   */
  competition_slug?: string;

  /**
   * Human-readable event label.
   *
   * EXAMPLES:
   * - United States vs Mexico
   * - Monaco Grand Prix
   * - UFC 320: Main Card
   *
   * If omitted, downstream layers may derive one from participants.
   */
  event_label?: string;

  /**
   * Canonical participants for the source event.
   *
   * NOTE:
   * This is more future-proof than hard-coding home/away strings only.
   */
  participants: SourceSportsParticipant[];

  /**
   * Event timing.
   */
  start_time_utc: string;
  end_time_utc?: string;

  /**
   * Source-facing event status.
   * Adapters should normalize as much as possible into this enum.
   */
  status: SourceSportsEventStatus;

  /**
   * Optional stage/round/season labels.
   *
   * EXAMPLES:
   * - Group Stage
   * - Quarterfinal
   * - Matchday 1
   * - 2026
   */
  round_label?: string;
  season_label?: string;
  event_type?: string;

  /**
   * Venue/location metadata.
   */
  venue?: SourceSportsVenue;

  /**
   * Broadcast / watch availability from the source payload.
   */
  broadcasts?: SourceSportsBroadcast[];

  /**
   * Optional timestamps from the source payload for sync/debug purposes.
   */
  source_updated_at?: string;
  ingested_at?: string;

  /**
   * Optional raw payload passthrough for debugging and reconciliation.
   *
   * IMPORTANT:
   * This should be stored carefully and used for traceability, not UI.
   */
  raw?: unknown;
};