// web/lib/sports/ingestion/fetchEspnScoreboard.ts

import { SourceSportsEvent } from "./types";

/**
 * ESPN Scoreboard API base
 *
 * Docs (unofficial but stable):
 * https://site.api.espn.com/apis/site/v2/sports/{sport}/{league}/scoreboard
 *
 * Examples:
 * - soccer/fifa-world-cup
 * - football/nfl
 * - basketball/nba
 */

type FetchEspnScoreboardOptions = {
  sport: string;        // e.g. "soccer"
  league: string;       // e.g. "fifa-world-cup"
  limit?: number;       // optional safety cap
};

/**
 * Fetch raw ESPN scoreboard and map into SourceSportsEvent
 *
 * This is intentionally:
 * - stateless
 * - disposable
 * - replaceable
 */
export async function fetchEspnScoreboard(
  options: FetchEspnScoreboardOptions
): Promise<SourceSportsEvent[]> {
  const { sport, league, limit = 50 } = options;

  const url = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/scoreboard`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "WatchWeek/1.0",
      },
      // IMPORTANT: do not cache → we want fresh sports data
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`ESPN fetch failed: ${res.status}`);
    }

    const data = await res.json();

    if (!data?.events || !Array.isArray(data.events)) {
      return [];
    }

    return mapEspnEventsToSourceSportsEvents(data.events, limit);

  } catch (err) {
    console.error("fetchEspnScoreboard error:", err);
    return [];
  }
}

/**
 * INTERNAL: ESPN → SourceSportsEvent mapping
 *
 * This is still part of ingestion layer (NOT normalization)
 */
function mapEspnEventsToSourceSportsEvents(
  events: any[],
  limit: number
): SourceSportsEvent[] {
  const results: SourceSportsEvent[] = [];

  for (const event of events.slice(0, limit)) {
    try {
      const competition = event.competitions?.[0];
      if (!competition) continue;

      const competitors = competition.competitors;
      if (!competitors || competitors.length < 2) continue;

      const home = competitors.find((c: any) => c.homeAway === "home");
      const away = competitors.find((c: any) => c.homeAway === "away");

      if (!home || !away) continue;

      const startTimeUtc = event.date;

      const broadcast =
        competition.broadcasts?.[0]?.names?.[0] ?? null;

      results.push({
        source: "espn",
        source_event_id: event.id,

        sport: event.sport?.name ?? "Unknown",
        competition: event.league?.name ?? "Unknown",

        home_team: home.team?.displayName ?? "TBD",
        away_team: away.team?.displayName ?? "TBD",

        start_time_utc: startTimeUtc,

        venue: competition.venue?.fullName ?? null,
        country: competition.venue?.address?.country ?? null,

        broadcast,
      });
    } catch (err) {
      console.warn("Failed to map ESPN event:", err);
      continue;
    }
  }

  return results;
}