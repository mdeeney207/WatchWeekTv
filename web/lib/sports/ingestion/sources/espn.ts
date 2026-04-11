import type {
  SourceSportsBroadcast,
  SourceSportsEvent,
  SourceSportsEventStatus,
  SourceSportsParticipant,
} from "../types";

/**
 * Minimal scoreboard-style payload support for ESPN's undocumented endpoints.
 *
 * DESIGN RULE:
 * - This adapter is intentionally defensive.
 * - ESPN payloads are unofficial and may drift.
 * - We map only what we need into SourceSportsEvent.
 */

type EspnLink = {
  href?: string;
  text?: string;
  shortText?: string;
  rel?: string[];
  isExternal?: boolean;
};

type EspnBroadcast = {
  names?: string[];
  market?: string;
  type?: {
    shortName?: string;
    longName?: string;
  };
};

type EspnVenue = {
  fullName?: string;
  address?: {
    city?: string;
    state?: string;
    country?: string;
  };
};

type EspnCompetitor = {
  id?: string;
  homeAway?: string;
  winner?: boolean;
  team?: {
    id?: string;
    abbreviation?: string;
    shortDisplayName?: string;
    displayName?: string;
    location?: string;
    name?: string;
  };
  athlete?: {
    id?: string;
    shortName?: string;
    displayName?: string;
  };
};

type EspnCompetitionStatus = {
  type?: {
    name?: string;
    state?: string;
    description?: string;
    detail?: string;
    shortDetail?: string;
    completed?: boolean;
  };
};

type EspnCompetition = {
  id?: string;
  date?: string;
  venue?: EspnVenue;
  competitors?: EspnCompetitor[];
  broadcasts?: EspnBroadcast[];
  status?: EspnCompetitionStatus;
  links?: EspnLink[];
};

type EspnLeague = {
  id?: string;
  abbreviation?: string;
  shortName?: string;
  displayName?: string;
  slug?: string;
};

type EspnSeason = {
  year?: number;
  displayName?: string;
  slug?: string;
  type?: {
    name?: string;
    abbreviation?: string;
  };
};

type EspnEventStatus = {
  type?: {
    name?: string;
    state?: string;
    description?: string;
    detail?: string;
    shortDetail?: string;
    completed?: boolean;
  };
};

export type EspnEventPayload = {
  id?: string;
  uid?: string;
  name?: string;
  shortName?: string;
  date?: string;
  status?: EspnEventStatus;
  competitions?: EspnCompetition[];
  links?: EspnLink[];
  season?: EspnSeason;
  week?: {
    number?: number;
  };
  circuit?: {
    fullName?: string;
  };
  leagues?: EspnLeague[];
  league?: EspnLeague;
  sport?: {
    name?: string;
  };
};

function cleanString(value: unknown): string | null {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function slugify(value: string | null | undefined): string | null {
  const input = cleanString(value);
  if (!input) return null;

  return input
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toSportName(value: string | null | undefined) {
  const normalized = cleanString(value);
  return normalized ?? "Unknown Sport";
}

function toCompetitionName(event: EspnEventPayload) {
  const leagueName =
    cleanString(event.league?.displayName) ??
    cleanString(event.league?.shortName) ??
    cleanString(event.leagues?.[0]?.displayName) ??
    cleanString(event.leagues?.[0]?.shortName);

  return leagueName ?? "Unknown Competition";
}

function toCompetitionSlug(event: EspnEventPayload) {
  return (
    cleanString(event.league?.slug) ??
    cleanString(event.leagues?.[0]?.slug) ??
    slugify(
      cleanString(event.league?.displayName) ??
        cleanString(event.leagues?.[0]?.displayName)
    )
  );
}

function toSourceCompetitionId(event: EspnEventPayload) {
  return (
    cleanString(event.league?.id) ??
    cleanString(event.leagues?.[0]?.id) ??
    null
  );
}

function normalizeEspnStatus(event: EspnEventPayload): SourceSportsEventStatus {
  const competition = event.competitions?.[0];

  const rawValues = [
    cleanString(event.status?.type?.state),
    cleanString(event.status?.type?.name),
    cleanString(event.status?.type?.description),
    cleanString(event.status?.type?.detail),
    cleanString(competition?.status?.type?.state),
    cleanString(competition?.status?.type?.name),
    cleanString(competition?.status?.type?.description),
    cleanString(competition?.status?.type?.detail),
  ]
    .filter(Boolean)
    .map((value) => value!.toLowerCase());

  const completedFlag =
    event.status?.type?.completed === true ||
    competition?.status?.type?.completed === true;

  if (
    rawValues.some((value) =>
      ["in", "live", "in_progress", "in progress", "ongoing", "halftime"].includes(
        value
      )
    )
  ) {
    return "live";
  }

  if (
    completedFlag ||
    rawValues.some((value) =>
      ["post", "final", "completed", "complete", "finished", "ended"].includes(
        value
      )
    )
  ) {
    return "completed";
  }

  if (
    rawValues.some((value) =>
      ["postponed", "postponement"].includes(value)
    )
  ) {
    return "postponed";
  }

  if (rawValues.some((value) => ["cancelled", "canceled"].includes(value))) {
    return "cancelled";
  }

  if (rawValues.some((value) => ["delayed", "delay"].includes(value))) {
    return "delayed";
  }

  if (rawValues.some((value) => ["suspended", "suspend"].includes(value))) {
    return "suspended";
  }

  if (
    rawValues.some((value) =>
      ["pre", "scheduled", "created", "preview"].includes(value)
    )
  ) {
    return "scheduled";
  }

  const startTime = cleanString(competition?.date) ?? cleanString(event.date);
  if (startTime) {
    const startMs = new Date(startTime).getTime();
    if (Number.isFinite(startMs)) {
      return startMs > Date.now() ? "scheduled" : "unknown";
    }
  }

  return "unknown";
}

function normalizeParticipantName(competitor: EspnCompetitor) {
  return (
    cleanString(competitor.team?.displayName) ??
    cleanString(competitor.team?.shortDisplayName) ??
    cleanString(competitor.athlete?.displayName) ??
    cleanString(competitor.athlete?.shortName) ??
    cleanString(competitor.team?.name) ??
    null
  );
}

function normalizeParticipants(event: EspnEventPayload): SourceSportsParticipant[] {
  const competition = event.competitions?.[0];
  const competitors = competition?.competitors ?? [];

  return competitors
    .map((competitor): SourceSportsParticipant | null => {
      const name = normalizeParticipantName(competitor);
      if (!name) return null;

      const role =
        competitor.homeAway === "home"
          ? "home"
          : competitor.homeAway === "away"
          ? "away"
          : "participant";

      return {
        source_participant_id:
          cleanString(competitor.team?.id) ??
          cleanString(competitor.athlete?.id) ??
          undefined,
        name,
        short_name: cleanString(competitor.team?.abbreviation) ?? undefined,
        role,
      };
    })
    .filter((item): item is SourceSportsParticipant => Boolean(item));
}

function buildEventLabel(
  event: EspnEventPayload,
  participants: SourceSportsParticipant[]
) {
  const explicit =
    cleanString(event.name) ?? cleanString(event.shortName);
  if (explicit) return explicit;

  const home = participants.find((participant) => participant.role === "home");
  const away = participants.find((participant) => participant.role === "away");

  if (home?.name && away?.name) {
    return `${home.name} vs ${away.name}`;
  }

  if (participants.length >= 2) {
    return `${participants[0].name} vs ${participants[1].name}`;
  }

  return toCompetitionName(event);
}

function normalizeBroadcasts(event: EspnEventPayload): SourceSportsBroadcast[] {
  const competition = event.competitions?.[0];
  const broadcasts = competition?.broadcasts ?? [];
  const links = [...(competition?.links ?? []), ...(event.links ?? [])];

  const eventStatus = normalizeEspnStatus(event);
  const defaultAvailabilityType =
    eventStatus === "live" ? "live_event" : eventStatus === "completed" ? "replay" : "unknown";

  const items: SourceSportsBroadcast[] = [];

  for (const broadcast of broadcasts) {
    const names = broadcast.names ?? [];
    for (const name of names) {
      const providerName = cleanString(name);
      if (!providerName) continue;

      items.push({
        provider_name: providerName,
        provider_slug: slugify(providerName) ?? undefined,
        availability_type: defaultAvailabilityType,
        is_primary: items.length === 0,
        market: cleanString(broadcast.market) ?? undefined,
        language: undefined,
      });
    }
  }

  /**
   * If ESPN gives us links but no structured broadcast names, keep at least one
   * generic watch destination so the ingest pipeline has something useful.
   */
  if (items.length === 0) {
    const firstExternal = links.find((link) => cleanString(link.href));
    if (firstExternal) {
      items.push({
        provider_name: "ESPN",
        provider_slug: "espn",
        availability_type: defaultAvailabilityType,
        is_primary: true,
        web_url: cleanString(firstExternal.href) ?? undefined,
      });
    }
  }

  /**
   * Backfill URLs onto primary broadcast when possible.
   */
  const firstHref = links.find((link) => cleanString(link.href));
  if (firstHref && items[0] && !items[0].web_url) {
    items[0].web_url = cleanString(firstHref.href) ?? undefined;
  }

  return items;
}

/**
 * Convert one ESPN event payload into WatchWeek's source-normalized
 * ingestion contract.
 *
 * EXPECTED INPUT:
 * A single object from ESPN scoreboard-style payloads under `events[]`.
 */
export function mapEspnEventToSourceSportsEvent(
  event: EspnEventPayload
): SourceSportsEvent {
  const competition = event.competitions?.[0];
  const participants = normalizeParticipants(event);
  const competitionName = toCompetitionName(event);
  const status = normalizeEspnStatus(event);

  return {
    source: "espn",
    source_event_id:
      cleanString(event.id) ??
      cleanString(event.uid) ??
      "",
    sport:
      toSportName(cleanString(event.sport?.name)) ??
      "Unknown Sport",
    competition: competitionName,
    source_competition_id: toSourceCompetitionId(event) ?? undefined,
    competition_slug: toCompetitionSlug(event) ?? undefined,
    event_label: buildEventLabel(event, participants),
    participants,
    start_time_utc:
      cleanString(competition?.date) ??
      cleanString(event.date) ??
      new Date(0).toISOString(),
    end_time_utc: undefined,
    status,
    round_label:
      cleanString(event.week?.number ? `Week ${event.week.number}` : null) ??
      cleanString(competition?.status?.type?.detail) ??
      undefined,
    season_label:
      cleanString(
        event.season?.displayName ??
          event.season?.year?.toString()
      ) ?? undefined,
    event_type:
      cleanString(event.season?.type?.name) ??
      undefined,
    venue: {
      name: cleanString(competition?.venue?.fullName) ?? undefined,
      city: cleanString(competition?.venue?.address?.city) ?? undefined,
      state_or_region:
        cleanString(competition?.venue?.address?.state) ?? undefined,
      country: cleanString(competition?.venue?.address?.country) ?? undefined,
    },
    broadcasts: normalizeBroadcasts(event),
    raw: event,
  };
}

/**
 * Convenience helper for mapping many ESPN events at once.
 */
export function mapEspnEventsToSourceSportsEvents(
  events: EspnEventPayload[]
): SourceSportsEvent[] {
  return events
    .map((event) => mapEspnEventToSourceSportsEvent(event))
    .filter((event) => Boolean(event.source_event_id) && Boolean(event.start_time_utc));
}