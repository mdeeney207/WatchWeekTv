import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TMDB_KEY = Deno.env.get("TMDB_API_KEY")!;

// 🔒 Change this any time you deploy so you can confirm the live function version.
const BUILD_TAG = "sync_show_v2026-02-18_provider_backfill_us_offers_fix_onconflict";

const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

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
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`TMDB ${path} failed: ${res.status} ${text}`.trim());
  }
  return await res.json();
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function toISODateOnly(d: string | null | undefined): string | null {
  const s = String(d ?? "").trim();
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

/**
 * Deterministic timestamp placeholder.
 * We do NOT guess an episode drop time. We store a stable ISO value so the column is non-null.
 */
function etMidnightIso(dateStr: string | null): string | null {
  if (!dateStr) return null;
  return new Date(`${dateStr}T00:00:00.000Z`).toISOString();
}

/**
 * Basic concurrency limiter (no deps).
 */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, idx: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;

  const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) break;
      results[idx] = await fn(items[idx], idx);
    }
  });

  await Promise.all(workers);
  return results;
}

async function getEpisodeRuntimeMinutes(
  tmdbTvId: number,
  season: number,
  episode: number
): Promise<number | null> {
  const ep = await tmdbJson(`/tv/${tmdbTvId}/season/${season}/episode/${episode}`);
  const rt = ep?.runtime;
  return typeof rt === "number" && Number.isFinite(rt) && rt > 0 ? rt : null;
}

type TmdbProvider = {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
};

type OfferType = "flatrate" | "ads";

/**
 * IMPORTANT:
 * PostgREST/Supabase can throw 42P10 when using ON CONFLICT against a partial unique index.
 * Even though you have streaming_services_tmdb_provider_id_uidx (WHERE tmdb_provider_id IS NOT NULL),
 * the safest approach is:
 *  1) SELECT by tmdb_provider_id
 *  2) Upsert by slug (unique)
 *  3) UPDATE tmdb_provider_id
 */
async function upsertServiceByTmdbProvider(p: {
  tmdb_provider_id: number;
  name: string;
  slug: string;
  logo_url: string | null;
}): Promise<{ id: string; tmdb_provider_id: number }> {
  // 1) Lookup by tmdb_provider_id
  const { data: existing, error: selErr } = await sb
    .from("streaming_services")
    .select("id, tmdb_provider_id")
    .eq("tmdb_provider_id", p.tmdb_provider_id)
    .maybeSingle();

  if (selErr) throw selErr;
  if (existing?.id) {
    return { id: existing.id, tmdb_provider_id: p.tmdb_provider_id };
  }

  // 2) Upsert by slug (guaranteed unique constraint)
  const { data: svcRow, error: upErr } = await sb
    .from("streaming_services")
    .upsert(
      { name: p.name, slug: p.slug, logo_url: p.logo_url },
      { onConflict: "slug" }
    )
    .select("id")
    .single();

  if (upErr) throw upErr;

  // 3) Attach tmdb_provider_id (unique index protects duplicates)
  const { error: updErr } = await sb
    .from("streaming_services")
    .update({ tmdb_provider_id: p.tmdb_provider_id })
    .eq("id", svcRow.id);

  if (updErr) throw updErr;

  return { id: svcRow.id, tmdb_provider_id: p.tmdb_provider_id };
}

async function upsertProvidersUS(show_id: string, tmdb_id: number) {
  const region = "US";

  const providers = await tmdbJson(`/tv/${tmdb_id}/watch/providers`);
  const us = providers?.results?.US ?? null;

  const offers: Array<{ offer_type: OfferType; list: TmdbProvider[] }> = [
    { offer_type: "flatrate", list: Array.isArray(us?.flatrate) ? us.flatrate : [] },
    { offer_type: "ads", list: Array.isArray(us?.ads) ? us.ads : [] },
  ];

  const normalized = offers
    .flatMap((o) =>
      (o.list ?? []).map((p) => ({
        offer_type: o.offer_type,
        provider_id: Number(p.provider_id),
        provider_name: String(p.provider_name ?? "").trim(),
        logo_path: p.logo_path ?? null,
      }))
    )
    .filter((p) => Number.isFinite(p.provider_id) && p.provider_id > 0 && p.provider_name);

  const expectedKeys = new Set<string>();

  let services_upserted = 0;
  let show_services_upserted = 0;

  for (const p of normalized) {
    const tmdb_provider_id = p.provider_id;
    const name = p.provider_name;
    const slug = slugify(name);
    const logo_url = p.logo_path ? `https://image.tmdb.org/t/p/w92${p.logo_path}` : null;

    // SAFE service upsert (no tmdb_provider_id ON CONFLICT)
    const svc = await upsertServiceByTmdbProvider({ tmdb_provider_id, name, slug, logo_url });
    services_upserted++;

    // show_services upsert
    const provider_show_id = String(tmdb_provider_id);
    const key = `${show_id}|${svc.id}|${region}|${p.offer_type}`;
    expectedKeys.add(key);

    const { error: linkErr } = await sb
      .from("show_services")
      .upsert(
        {
          show_id,
          service_id: svc.id,
          provider_show_id,
          region,
          offer_type: p.offer_type,
          is_manual: false,
        },
        { onConflict: "show_id,service_id,region,offer_type" }
      );

    if (linkErr) throw linkErr;
    show_services_upserted++;
  }

  // prune stale auto rows (keep manual always)
  const { data: existingRows, error: existingErr } = await sb
    .from("show_services")
    .select("service_id,region,offer_type,is_manual")
    .eq("show_id", show_id)
    .eq("region", region);

  if (existingErr) throw existingErr;

  const stale = (existingRows ?? []).filter((r) => {
    if (r.is_manual) return false;
    const k = `${show_id}|${r.service_id}|${r.region}|${r.offer_type}`;
    return !expectedKeys.has(k);
  });

  for (const r of stale) {
    const { error: delErr } = await sb
      .from("show_services")
      .delete()
      .eq("show_id", show_id)
      .eq("service_id", r.service_id)
      .eq("region", region)
      .eq("offer_type", r.offer_type)
      .eq("is_manual", false);

    if (delErr) throw delErr;
  }

  // Primary selection (US)
  const { data: ssRows, error: ssErr } = await sb
    .from("show_services")
    .select("service_id,is_manual,is_primary,offer_type")
    .eq("show_id", show_id)
    .eq("region", region);

  if (ssErr) throw ssErr;

  const rows = ssRows ?? [];
  const manualPrimary = rows.find((r) => r.is_manual === true && r.is_primary === true) ?? null;

  let chosenPrimary: string | null = null;

  if (manualPrimary?.service_id) {
    chosenPrimary = manualPrimary.service_id;
  } else {
    const flatrateIds = Array.from(
      new Set(
        rows
          .filter((r) => r.offer_type === "flatrate")
          .map((r) => r.service_id)
          .filter(Boolean)
      )
    );

    if (flatrateIds.length === 1) {
      chosenPrimary = flatrateIds[0];
    } else if (flatrateIds.length > 1) {
      const { data: ranks, error: rankErr } = await sb
        .from("service_priority")
        .select("service_id,rank")
        .in("service_id", flatrateIds);

      if (rankErr) throw rankErr;

      const rankMap = new Map<string, number>();
      for (const r of ranks ?? []) rankMap.set(r.service_id, r.rank);

      chosenPrimary =
        flatrateIds
          .slice()
          .sort((a, b) => {
            const ra = rankMap.has(a) ? rankMap.get(a)! : 9999;
            const rb = rankMap.has(b) ? rankMap.get(b)! : 9999;
            if (ra !== rb) return ra - rb;
            return a.localeCompare(b);
          })[0] ?? null;
    } else {
      const anyIds = Array.from(new Set(rows.map((r) => r.service_id).filter(Boolean)));
      if (anyIds.length) {
        const { data: ranks, error: rankErr } = await sb
          .from("service_priority")
          .select("service_id,rank")
          .in("service_id", anyIds);

        if (rankErr) throw rankErr;

        const rankMap = new Map<string, number>();
        for (const r of ranks ?? []) rankMap.set(r.service_id, r.rank);

        chosenPrimary =
          anyIds
            .slice()
            .sort((a, b) => {
              const ra = rankMap.has(a) ? rankMap.get(a)! : 9999;
              const rb = rankMap.has(b) ? rankMap.get(b)! : 9999;
              if (ra !== rb) return ra - rb;
              return a.localeCompare(b);
            })[0] ?? null;
      }
    }
  }

  if (chosenPrimary) {
    const { error: clearErr } = await sb
      .from("show_services")
      .update({ is_primary: false })
      .eq("show_id", show_id)
      .eq("region", region)
      .eq("is_primary", true);

    if (clearErr) throw clearErr;

    const { error: setErr } = await sb
      .from("show_services")
      .update({ is_primary: true })
      .eq("show_id", show_id)
      .eq("region", region)
      .eq("service_id", chosenPrimary);

    if (setErr) throw setErr;
  }

  return {
    region,
    offers_seen: {
      flatrate: Array.isArray(us?.flatrate) ? us.flatrate.length : 0,
      ads: Array.isArray(us?.ads) ? us.ads.length : 0,
    },
    services_upserted,
    show_services_upserted,
    stale_removed: stale.length,
    chosen_primary_service_id: chosenPrimary,
  };
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
      return json(400, { error: "tmdb_id (number) or tmdbId (number) required" });
    }

    // Optional tuning knobs (safe defaults)
    const RUNTIME_CONCURRENCY =
      typeof body?.runtimeConcurrency === "number" && body.runtimeConcurrency > 0
        ? Math.min(20, Math.floor(body.runtimeConcurrency))
        : 8;

    // 1) Show details
    const show = await tmdbJson(`/tv/${tmdb_id}`);
    const showTitle = show?.name ?? show?.original_name ?? `tmdb:${tmdb_id}`;
    const poster_url = show?.poster_path ? `https://image.tmdb.org/t/p/w500${show.poster_path}` : null;
    const status = show?.status ?? null;

    const { data: showRow, error: showErr } = await sb
      .from("shows")
      .upsert({ tmdb_id, title: showTitle, poster_url, status }, { onConflict: "tmdb_id" })
      .select("id")
      .single();

    if (showErr) throw showErr;
    const show_id: string = showRow.id;

    // 2) Provider backfill (US, flatrate+ads)
    const provider_backfill = await upsertProvidersUS(show_id, tmdb_id);

    // 3) Episodes (all seasons)
    const seasons = (show?.seasons ?? []).filter((s: any) => Number(s?.season_number) > 0);

    let upserted = 0;
    let runtimesFetched = 0;

    let debug_sample_episode_name: string | null = null;
    let debug_sample_keys: string[] | null = null;

    for (const s of seasons) {
      const seasonNum = Number(s.season_number);
      const seasonData = await tmdbJson(`/tv/${tmdb_id}/season/${seasonNum}`);
      const eps = seasonData?.episodes ?? [];

      if (!debug_sample_keys && eps?.length) {
        debug_sample_keys = Object.keys(eps[0] ?? {});
        debug_sample_episode_name = (eps[0]?.name ?? null) as string | null;
      }

      const filtered = eps.filter((e: any) => e?.air_date && e?.episode_number);

      const rows = await mapLimit(filtered, RUNTIME_CONCURRENCY, async (e: any) => {
        const airDate = toISODateOnly(e.air_date);
        const airDateUtc = airDate ? new Date(`${airDate}T00:00:00.000Z`).toISOString() : null;

        let runtime: number | null = typeof e.runtime === "number" ? e.runtime : null;
        if (!runtime || runtime <= 0) {
          try {
            runtime = await getEpisodeRuntimeMinutes(tmdb_id, seasonNum, Number(e.episode_number));
            if (runtime) runtimesFetched++;
          } catch (err) {
            console.warn(
              `[sync_show] runtime fetch failed tmdb:${tmdb_id} S${seasonNum}E${Number(e.episode_number)}:`,
              String(err)
            );
            runtime = null;
          }
        }

        return {
          show_id,
          season: seasonNum,
          episode: Number(e.episode_number),

          title: (e.name ?? null) as string | null,
          air_date: airDate,
          air_datetime_et: etMidnightIso(airDate),
          air_date_utc: airDateUtc,

          overview: (e.overview ?? null) as string | null,
          still_path: (e.still_path ?? null) as string | null,
          runtime,
          vote_average: typeof e.vote_average === "number" ? e.vote_average : null,
          vote_count: typeof e.vote_count === "number" ? e.vote_count : null,
          production_code: (e.production_code ?? null) as string | null,
        };
      });

      if (!rows.length) continue;

      const { error: epErr } = await sb.from("episodes").upsert(rows, {
        onConflict: "show_id,season,episode",
      });

      if (epErr) throw epErr;
      upserted += rows.length;
    }

    return json(200, {
      ok: true,
      build: BUILD_TAG,
      show_id,
      provider_backfill,
      episodes_upserted: upserted,
      runtimes_fetched_from_episode_detail: runtimesFetched,
      runtime_concurrency: RUNTIME_CONCURRENCY,
      debug_sample_episode_name,
      debug_sample_keys,
    });
  } catch (e) {
    const errObj = e && typeof e === "object" ? (e as Record<string, unknown>) : null;

    const details = errObj
      ? {
          name: errObj["name"],
          message: errObj["message"],
          code: errObj["code"],
          details: errObj["details"],
          hint: errObj["hint"],
          stack: errObj["stack"],
        }
      : { message: String(e) };

    console.error("[sync_show] ERROR", details);

    return json(500, {
      error: (details as any)?.message ?? String(e),
      details, // TEMP: remove after fixed
    });
  }
});
