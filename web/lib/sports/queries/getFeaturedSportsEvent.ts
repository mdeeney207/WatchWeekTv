import { supabaseServer } from "@/lib/supabase-server";
import { normalizeSportsCardItem } from "@/lib/sports/normalizeSportsCardItem";
import type { SportsCardItem } from "@/lib/sports/types";

export async function getFeaturedSportsEvent(): Promise<SportsCardItem | null> {
  const supabase = await supabaseServer();

  const { data, error } = await supabase
    .from("v_sports_event_watch_options_v2")
    .select("*")
    .gte("start_time_utc", new Date().toISOString())
    .order("start_time_utc", { ascending: true })
    .limit(50);

  if (error) {
    throw new Error(`Failed to load featured sports event: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return null;
  }

  const grouped = new Map<string, any[]>();

  for (const row of data) {
    const existing = grouped.get(row.sports_event_id) ?? [];
    existing.push(row);
    grouped.set(row.sports_event_id, existing);
  }

  const firstEvent = grouped.values().next().value;

  return normalizeSportsCardItem(firstEvent);
}