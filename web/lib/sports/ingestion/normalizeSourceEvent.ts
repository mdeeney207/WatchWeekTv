import {
  type SourceSportsBroadcast,
  type SourceSportsEvent,
  type SourceSportsParticipant,
} from "./types";

export type NormalizedIngestedSportsEvent = {
  source: string;
  source_event_id: string;

  sport_name: string;
  competition_name: string;
  source_competition_id: string | null;
  competition_slug: string | null;

  event_label: string;
  status: string;

  season_label: string | null;
  round_label: string | null;
  event_type: string | null;

  home_competitor: string | null;
  away_competitor: string | null;

  start_time_utc: string;
  end_time_utc: string | null;

  venue_name: string | null;
  venue_city: string | null;
  venue_state_or_region: string | null;
  venue_country: string | null;
  venue_country_code: string | null;
  venue_timezone: string | null;

  broadcasts: Array<{
    provider_name: string;
    provider_slug: string | null;
    availability_type: string | null;
    is_primary: boolean;
    market: string | null;
    language: string | null;
    web_url: string | null;
    ios_url: string | null;
    android_url: string | null;
  }>;

  source_updated_at: string | null;
  ingested_at: string | null;
  raw: unknown;
};

function cleanString(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function findParticipantByRole(
  participants: SourceSportsParticipant[],
  role: "home" | "away"
) {
  return (
    participants.find((participant) => participant.role === role) ?? null
  );
}

function buildEventLabel(event: SourceSportsEvent) {
  const explicitLabel = cleanString(event.event_label);
  if (explicitLabel) return explicitLabel;

  const participants = event.participants ?? [];
  const home = findParticipantByRole(participants, "home");
  const away = findParticipantByRole(participants, "away");

  if (home?.name && away?.name) {
    return `${home.name} vs ${away.name}`;
  }

  if (participants.length >= 2) {
    const firstTwo = participants
      .map((participant) => cleanString(participant.name))
      .filter(Boolean)
      .slice(0, 2);

    if (firstTwo.length === 2) {
      return `${firstTwo[0]} vs ${firstTwo[1]}`;
    }
  }

  const competitionName = cleanString(event.competition);
  if (competitionName) return competitionName;

  return "Sports Event";
}

function normalizeBroadcast(
  broadcast: SourceSportsBroadcast
): NormalizedIngestedSportsEvent["broadcasts"][number] | null {
  const providerName = cleanString(broadcast.provider_name);
  if (!providerName) return null;

  return {
    provider_name: providerName,
    provider_slug: cleanString(broadcast.provider_slug),
    availability_type: cleanString(broadcast.availability_type),
    is_primary: Boolean(broadcast.is_primary),
    market: cleanString(broadcast.market),
    language: cleanString(broadcast.language),
    web_url: cleanString(broadcast.web_url),
    ios_url: cleanString(broadcast.ios_url),
    android_url: cleanString(broadcast.android_url),
  };
}

export function normalizeSourceEvent(
  event: SourceSportsEvent
): NormalizedIngestedSportsEvent {
  const participants = event.participants ?? [];

  const home = findParticipantByRole(participants, "home");
  const away = findParticipantByRole(participants, "away");

  const fallbackParticipants = participants
    .map((participant) => cleanString(participant.name))
    .filter((value): value is string => Boolean(value));

  const homeCompetitor =
    cleanString(home?.name) ??
    fallbackParticipants[0] ??
    null;

  const awayCompetitor =
    cleanString(away?.name) ??
    fallbackParticipants[1] ??
    null;

  const broadcasts = (event.broadcasts ?? [])
    .map(normalizeBroadcast)
    .filter(
      (
        item
      ): item is NormalizedIngestedSportsEvent["broadcasts"][number] => Boolean(item)
    );

  return {
    source: cleanString(event.source) ?? "unknown",
    source_event_id: cleanString(event.source_event_id) ?? "",

    sport_name: cleanString(event.sport) ?? "Unknown Sport",
    competition_name: cleanString(event.competition) ?? "Unknown Competition",
    source_competition_id: cleanString(event.source_competition_id),
    competition_slug: cleanString(event.competition_slug),

    event_label: buildEventLabel(event),
    status: cleanString(event.status) ?? "unknown",

    season_label: cleanString(event.season_label),
    round_label: cleanString(event.round_label),
    event_type: cleanString(event.event_type),

    home_competitor: homeCompetitor,
    away_competitor: awayCompetitor,

    start_time_utc: event.start_time_utc,
    end_time_utc: cleanString(event.end_time_utc),

    venue_name: cleanString(event.venue?.name),
    venue_city: cleanString(event.venue?.city),
    venue_state_or_region: cleanString(event.venue?.state_or_region),
    venue_country: cleanString(event.venue?.country),
    venue_country_code: cleanString(event.venue?.country_code),
    venue_timezone: cleanString(event.venue?.timezone),

    broadcasts,

    source_updated_at: cleanString(event.source_updated_at),
    ingested_at: cleanString(event.ingested_at),
    raw: event.raw ?? null,
  };
}