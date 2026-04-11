import { supabaseServer } from "@/lib/supabase-server";

export type SportsWatchOptionRow = {
  sports_event_id: string;
  sport_key: string | null;
  sport_name: string | null;
  competition_key: string | null;
  competition_name: string | null;
  competition_slug: string | null;
  event_label: string | null;
  start_time_utc: string;
  end_time_utc: string | null;
  status: string | null;
  season_label: string | null;
  round_label: string | null;
  event_type: string | null;
  home_competitor: string | null;
  away_competitor: string | null;
  venue_name: string | null;
  venue_city: string | null;
  venue_country: string | null;
  provider_name: string | null;
  provider_slug: string | null;
  provider_kind: string | null;
  logo_url: string | null;
  web_url: string | null;
  ios_url: string | null;
  android_url: string | null;
  market: string | null;
  language: string | null;
  availability_type: string | null;
  available_from_utc: string | null;
  available_until_utc: string | null;
  is_live: boolean | null;
  is_primary: boolean | null;
  availability_sort_order: number | null;
  primary_sort_order: number | null;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

/**
 * Loads all watch-option rows for a single sports event.
 *
 * IMPORTANT:
 * This function is intentionally query-layer only.
 * It does not decide LIVE / UPCOMING / COMPLETED truth.
 * It only returns a stable, well-ordered set of rows for the event page
 * and normalization layers to consume.
 */
export async function getSportsEventById(
  eventId: string
): Promise<SportsWatchOptionRow[]> {
  const normalizedEventId = String(eventId ?? "").trim();

  if (!normalizedEventId) {
    throw new Error("Sports event id is required.");
  }

  /**
   * Prevent invalid UUID strings from hitting Postgres/Supabase and causing
   * noisy runtime failures like:
   * invalid input syntax for type uuid
   */
  if (!isUuid(normalizedEventId)) {
    return [];
  }

  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from("v_sports_event_watch_options_v2")
    .select(
      `
        sports_event_id,
        sport_key,
        sport_name,
        competition_key,
        competition_name,
        competition_slug,
        event_label,
        start_time_utc,
        end_time_utc,
        status,
        season_label,
        round_label,
        event_type,
        home_competitor,
        away_competitor,
        venue_name,
        venue_city,
        venue_country,
        provider_name,
        provider_slug,
        provider_kind,
        logo_url,
        web_url,
        ios_url,
        android_url,
        market,
        language,
        availability_type,
        available_from_utc,
        available_until_utc,
        is_live,
        is_primary,
        availability_sort_order,
        primary_sort_order
      `
    )
    .eq("sports_event_id", normalizedEventId)
    .order("is_primary", { ascending: false })
    .order("is_live", { ascending: false })
    .order("primary_sort_order", { ascending: true, nullsFirst: false })
    .order("availability_sort_order", { ascending: true, nullsFirst: false })
    .order("language", { ascending: true, nullsFirst: false })
    .order("provider_name", { ascending: true, nullsFirst: false });

  if (error) {
    throw new Error(`Failed to load sports event: ${error.message}`);
  }

  return (data ?? []) as SportsWatchOptionRow[];
}