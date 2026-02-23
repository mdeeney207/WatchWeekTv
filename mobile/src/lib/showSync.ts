import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TMDB_KEY = Deno.env.get("TMDB_API_KEY")!;

const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function tmdbJson(path: string) {
  const url =
    `https://api.themoviedb.org/3${path}` +
    (path.includes("?") ? "&" : "?") +
    `api_key=${TMDB_KEY}&language=en-US`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB ${path} failed: ${res.status}`);
  return await res.json();
}

function toISODateOnly(d: string | null | undefined): string | null {
  const s = String(d ?? "").trim();
  // TMDB provides YYYY-MM-DD; leave as-is
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

// For ET drop timestamp: we don't guess an hour.
// We store NULL unless you have real drop time logic later.
function toEtTimestampOrNull(dateStr: string | null): string | null {
  if (!dateStr) return null;
  return null;
}

serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));

    const tmdb_id =
      typeof body?.tmdb_id === "number"
        ? body.tmdb_id
        : typeof body?.tmdbId === "number"
          ? body.tmdbId
          : null;

    if (!tmdb_id) {
      return new Response(JSON.stringify({ error: "tmdb_id (number) or tmdbId (number) required" }), {
        status: 400,
      });
    }

    // 1) Show details
    const show = await tmdbJson(`/tv/${tmdb_id}`);
    const title = show?.name ?? show?.original_name ?? `tmdb:${tmdb_id}`;
    const poster_url = show?.poster_path
      ? `https://image.tmdb.org/t/p/w500${show.poster_path}`
      : null;
    const status = show?.status ?? null;

    // Upsert show (tmdb_id UNIQUE)
    const { data: showRow, error: showErr } = await sb
      .from("shows")
      .upsert({ tmdb_id, title, poster_url, status }, { onConflict: "tmdb_id" })
      .select("id")
      .single();

    if (showErr) throw showErr;
    const show_id: string = showRow.id;

    // 2) Providers (US flatrate) -> streaming_services + show_services
    const providers = await tmdbJson(`/tv/${tmdb_id}/watch/providers`);
    const flatrate = providers?.results?.US?.flatrate ?? [];

    // track which services are linked for this show this run
    const linkedServiceIds: string[] = [];

    for (const p of flatrate) {
      const name: string = p.provider_name;
      const slug = slugify(name);
      const logo_url = p.logo_path ? `https://image.tmdb.org/t/p/w92${p.logo_path}` : null;

      const { data: svcRow, error: svcErr } = await sb
        .from("streaming_services")
        .upsert({ name, slug, logo_url }, { onConflict: "slug" })
        .select("id")
        .single();

      if (svcErr) throw svcErr;
      linkedServiceIds.push(svcRow.id);

      const { error: linkErr } = await sb
        .from("show_services")
        .upsert({ show_id, service_id: svcRow.id }, { onConflict: "show_id,service_id" });

      if (linkErr) throw linkErr;
    }

    // 2.1) Ensure primary service:
    // If a manual primary exists, leave it alone.
    // Else: if no primary set, set the first linked service as primary (deterministic by id sort).
    const { data: existingSS, error: ssErr } = await sb
      .from("show_services")
      .select("service_id,is_primary,is_manual")
      .eq("show_id", show_id);

    if (ssErr) throw ssErr;

    const hasManual = (existingSS ?? []).some((x: any) => x.is_manual === true && x.is_primary === true);
    const hasPrimary = (existingSS ?? []).some((x: any) => x.is_primary === true);

    if (!hasManual) {
      if (!hasPrimary) {
        const candidates = (existingSS ?? [])
          .map((x: any) => x.service_id)
          .filter(Boolean)
          .sort();
        if (candidates.length) {
          const picked = candidates[0];

          // clear (safety)
          await sb.from("show_services").update({ is_primary: false }).eq("show_id", show_id);

          // set picked primary
          await sb
            .from("show_services")
            .update({ is_primary: true })
            .eq("show_id", show_id)
            .eq("service_id", picked);
        }
      }
    }

    // 3) Episodes (all seasons) — WRITE YOUR REAL COLUMNS
    const seasons = (show?.seasons ?? []).filter((s: any) => Number(s?.season_number) > 0);
    let upserted = 0;

    for (const s of seasons) {
      const seasonNum = Number(s.season_number);
      const seasonData = await tmdbJson(`/tv/${tmdb_id}/season/${seasonNum}`);
      const eps = seasonData?.episodes ?? [];

      const rows = eps
        .filter((e: any) => e?.air_date && e?.episode_number)
        .map((e: any) => {
          const airDate = toISODateOnly(e.air_date); // YYYY-MM-DD
          const airDateUtc = airDate ? new Date(`${airDate}T00:00:00.000Z`).toISOString() : null;

          return {
            show_id,
            season: seasonNum,
            episode: Number(e.episode_number),

            // ✅ your column exists
            title: e.name ?? null,

            // ✅ your column exists (date)
            air_date: airDate,

            // ✅ your column exists (timestamp) - leave null unless you have real ET time logic
            air_datetime_et: toEtTimestampOrNull(airDate),

            // ✅ keep utc (you already have this column)
            air_date_utc: airDateUtc,

            // optional metadata (all exist in your episodes table)
            overview: e.overview ?? null,
            still_path: e.still_path ?? null,
            runtime: typeof e.runtime === "number" ? e.runtime : null,
            vote_average: typeof e.vote_average === "number" ? e.vote_average : null,
            vote_count: typeof e.vote_count === "number" ? e.vote_count : null,
            production_code: e.production_code ?? null,
          };
        });

      if (!rows.length) continue;

      const { error: epErr } = await sb
        .from("episodes")
        .upsert(rows, { onConflict: "show_id,season,episode" });

      if (epErr) throw epErr;
      upserted += rows.length;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        show_id,
        services_linked: flatrate.length,
        episodes_upserted: upserted,
      }),
      { status: 200 }
    );
  } catch (e) {
    console.error("[sync_show] ERROR", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
