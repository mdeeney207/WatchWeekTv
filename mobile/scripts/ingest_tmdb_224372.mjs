import { createClient } from "@supabase/supabase-js";

// Use the same env vars your app uses
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

// OPTIONAL: if RLS blocks inserts, set SUPABASE_SERVICE_ROLE_KEY and uncomment the client below.
// const SUPABASE_SERVICE_ROLE_KEY =
//   process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "Missing SUPABASE env vars. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY."
  );
  process.exit(1);
}

// Use anon by default (matches app). Switch to service role only if you hit RLS errors.
// const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY);
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TMDB_ID = 224372;

async function tmdbProxy(body) {
  const { data, error } = await supabase.functions.invoke("tmdb_proxy", { body });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("tmdb_proxy returned no data");
  return data;
}

function airDateToUtcMidnight(air_date) {
  if (!air_date) return null;
  return `${air_date}T00:00:00.000Z`;
}

function airDateOnly(air_date) {
  // episodes.air_date is a DATE column
  return air_date || null;
}

async function ensureShowRow() {
  const { data: found, error: selErr } = await supabase
    .from("shows")
    .select("id, tmdb_id, title")
    .eq("tmdb_id", TMDB_ID)
    .maybeSingle();

  if (selErr) throw selErr;
  if (found?.id) return found;

  const { data: inserted, error: insErr } = await supabase
    .from("shows")
    .insert({ tmdb_id: TMDB_ID, title: "A Knight of the Seven Kingdoms" })
    .select("id, tmdb_id, title")
    .single();

  if (insErr) throw insErr;
  return inserted;
}

async function main() {
  console.log("[ingest] start TMDB:", TMDB_ID);

  const show = await ensureShowRow();
  console.log("[ingest] show:", show);

  const tv = await tmdbProxy({ path: `/tv/${TMDB_ID}` });
  const seasons = (tv?.seasons || []).filter((s) => s?.season_number != null);

  console.log("[ingest] seasons:", seasons.map((s) => s.season_number));

  let totalUpserts = 0;

  for (const s of seasons) {
    const seasonNumber = s.season_number;
    if (seasonNumber === 0) continue; // skip specials

    const season = await tmdbProxy({ path: `/tv/${TMDB_ID}/season/${seasonNumber}` });
    const eps = season?.episodes || [];

    const rows = eps
      .filter((e) => e?.episode_number != null)
      .map((e) => ({
        show_id: show.id,
        season: seasonNumber,
        episode: e.episode_number,
        air_date_utc: airDateToUtcMidnight(e.air_date),
        air_date: airDateOnly(e.air_date),
        // You just added episodes.title via SQL above
        title: e.name ?? null,
        overview: e.overview ?? null,
        still_path: e.still_path ?? null,
        runtime: e.runtime ?? null,
        vote_average: e.vote_average ?? null,
        vote_count: e.vote_count ?? null,
        production_code: e.production_code ?? null,
      }));

    if (rows.length === 0) continue;

    const { error } = await supabase
      .from("episodes")
      .upsert(rows, { onConflict: "show_id,season,episode" });

    if (error) throw error;

    totalUpserts += rows.length;
    console.log(`[ingest] S${seasonNumber}: upserted ${rows.length}`);
  }

  console.log("[ingest] done. total upserts:", totalUpserts);
}

main().catch((e) => {
  console.error("[ingest] FAILED:", e);
  process.exit(1);
});
