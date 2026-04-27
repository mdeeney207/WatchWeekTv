import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TMDB_KEY = Deno.env.get("TMDB_API_KEY")!;

// Change this on deploy so you can confirm the live function version.
const BUILD_TAG = "sync_show_v2026-04-26_backdrop_provider_primary_v53";

const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

type TmdbProvider = {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
};

type OfferType = "flatrate" | "ads";

type TmdbNetwork = {
  id: number;
  name: string;
  logo_path?: string | null;
  origin_country?: string | null;
};

type TmdbEpisode = {
  season_number?: number | null;
  episode_number?: number | null;
  name?: string | null;
  air_date?: string | null;
  overview?: string | null;
  still_path?: string | null;
  runtime?: number | null;
  vote_average?: number | null;
  vote_count?: number | null;
  production_code?: string | null;
};

function getCorsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("origin") ?? "*";

  return {
    "access-control-allow-origin": origin,
    vary: "Origin",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers":
      "authorization, x-client-info, apikey, content-type, x-requested-with, accept, origin",
    "access-control-max-age": "86400",
    "content-type": "application/json",
  };
}

function json(req: Request, status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: getCorsHeaders(req),
  });
}

function empty(req: Request, status = 200) {
  return new Response(null, {
    status,
    headers: getCorsHeaders(req),
  });
}

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

function toISODateOnly(d: string | null | undefined): string | null {
  const s = String(d ?? "").trim();
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

/**
 * Stable UTC anchor for date-only releases.
 * This is NOT a real release time.
 * It only gives the database a deterministic sortable timestamp.
 */
function dateOnlyAnchorUtc(dateStr: string | null): string | null {
  if (!dateStr) return null;
  return new Date(`${dateStr}T00:00:00.000Z`).toISOString();
}

/**
 * Basic concurrency limiter (no deps).
 */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, idx: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;

  const workers = new Array(Math.min(limit, items.length)).fill(0).map(
    async () => {
      while (true) {
        const idx = i++;
        if (idx >= items.length) break;
        results[idx] = await fn(items[idx], idx);
      }
    },
  );

  await Promise.all(workers);
  return results;
}

async function getEpisodeRuntimeMinutes(
  tmdbTvId: number,
  season: number,
  episode: number,
): Promise<number | null> {
  const ep = await tmdbJson(`/tv/${tmdbTvId}/season/${season}/episode/${episode}`);
  const rt = ep?.runtime;
  return typeof rt === "number" && Number.isFinite(rt) && rt > 0 ? rt : null;
}

async function buildEpisodeRow(params: {
  show_id: string;
  tmdb_id: number;
  seasonNum: number;
  episode: TmdbEpisode;
}): Promise<{
  row: Record<string, unknown> | null;
  runtimeFetched: boolean;
}> {
  const episodeNumber = Number(params.episode?.episode_number);
  if (!Number.isFinite(episodeNumber) || episodeNumber <= 0) {
    return { row: null, runtimeFetched: false };
  }

  const airDate = toISODateOnly(params.episode?.air_date);
  if (!airDate) {
    return { row: null, runtimeFetched: false };
  }

  const airDateUtc = dateOnlyAnchorUtc(airDate);

  let runtime: number | null =
    typeof params.episode.runtime === "number" && params.episode.runtime > 0
      ? params.episode.runtime
      : null;

  let runtimeFetched = false;

  if (!runtime || runtime <= 0) {
    try {
      runtime = await getEpisodeRuntimeMinutes(
        params.tmdb_id,
        params.seasonNum,
        episodeNumber,
      );
      runtimeFetched = Boolean(runtime);
    } catch (err) {
      console.warn(
        `[sync_show] runtime fetch failed tmdb:${params.tmdb_id} S${params.seasonNum}E${episodeNumber}:`,
        String(err),
      );
      runtime = null;
    }
  }

  return {
    row: {
      show_id: params.show_id,
      season: params.seasonNum,
      episode: episodeNumber,

      title: (params.episode.name ?? null) as string | null,
      air_date: airDate,

      // Legacy column kept nullable on purpose.
      air_datetime_et: null,

      // Stable UTC anchor for ordering/filtering only.
      air_date_utc: airDateUtc,

      source_release_raw: airDate,
      release_precision: "date_only",
      source_timezone: null,

      overview: (params.episode.overview ?? null) as string | null,
      still_path: (params.episode.still_path ?? null) as string | null,
      runtime,
      vote_average:
        typeof params.episode.vote_average === "number"
          ? params.episode.vote_average
          : null,
      vote_count:
        typeof params.episode.vote_count === "number"
          ? params.episode.vote_count
          : null,
      production_code: (params.episode.production_code ?? null) as string | null,
    },
    runtimeFetched,
  };
}

function normalizeNetworkCandidates(
  networks: TmdbNetwork[] | null | undefined,
): string[] {
  if (!Array.isArray(networks) || networks.length === 0) return [];

  const seen = new Set<string>();
  const out: string[] = [];

  for (const n of networks) {
    const name = String(n?.name ?? "").trim();
    if (!name) continue;

    const key = name.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    out.push(name);
  }

  return out;
}

async function resolveNetworkServiceId(
  networkNames: string[],
): Promise<string | null> {
  for (const networkName of networkNames) {
    const { data, error } = await sb.rpc("resolve_network_service_id", {
      p_network_name: networkName,
    });

    if (error) {
      throw new Error(
        `resolve_network_service_id failed for "${networkName}": ${error.message}`,
      );
    }

    if (data && typeof data === "string") {
      return data;
    }
  }

  return null;
}

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
  const { data: existing, error: selErr } = await sb
    .from("streaming_services")
    .select("id, tmdb_provider_id")
    .eq("tmdb_provider_id", p.tmdb_provider_id)
    .maybeSingle();

  if (selErr) throw selErr;
  if (existing?.id) {
    return { id: existing.id, tmdb_provider_id: p.tmdb_provider_id };
  }

  const { data: svcRow, error: upErr } = await sb
    .from("streaming_services")
    .upsert(
      { name: p.name, slug: p.slug, logo_url: p.logo_url },
      { onConflict: "slug" },
    )
    .select("id")
    .single();

  if (upErr) throw upErr;

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
    {
      offer_type: "flatrate",
      list: Array.isArray(us?.flatrate) ? us.flatrate : [],
    },
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
    .filter((p) =>
      Number.isFinite(p.provider_id) && p.provider_id > 0 && p.provider_name
    );

  const expectedKeys = new Set<string>();

  let services_upserted = 0;
  let show_services_upserted = 0;

  /**
   * Production safety v53:
   * Preserve an existing primary provider if one already exists. Provider
   * backfill should not churn primary rows during normal sync because the DB
   * enforces exactly one primary per show + region + offer_type.
   *
   * New automatic provider rows are inserted as non-primary. Existing provider
   * rows keep their current primary state. If there is no primary at all after
   * backfill, the final section chooses one canonical primary.
   */
  const { data: existingPrimaryRows, error: existingPrimaryErr } = await sb
    .from("show_services")
    .select("service_id,offer_type,is_manual")
    .eq("show_id", show_id)
    .ilike("region", region)
    .eq("is_primary", true);

  if (existingPrimaryErr) throw existingPrimaryErr;

  const existingPrimaryByOfferType = new Map<OfferType, string>();
  for (const r of existingPrimaryRows ?? []) {
    const offerType = String(r.offer_type ?? "").toLowerCase() as OfferType;
    if ((offerType === "flatrate" || offerType === "ads") && r.service_id) {
      if (!existingPrimaryByOfferType.has(offerType)) {
        existingPrimaryByOfferType.set(offerType, r.service_id);
      }
    }
  }

  for (const p of normalized) {
    const tmdb_provider_id = p.provider_id;
    const name = p.provider_name;
    const slug = slugify(name);
    const logo_url = p.logo_path
      ? `https://image.tmdb.org/t/p/w92${p.logo_path}`
      : null;

    const svc = await upsertServiceByTmdbProvider({
      tmdb_provider_id,
      name,
      slug,
      logo_url,
    });
    services_upserted++;

    // TMDB watch/providers gives provider identity, not a provider-specific show id.
    const provider_show_id: string | null = null;

    const key = `${show_id}|${svc.id}|${region}|${p.offer_type}`;
    expectedKeys.add(key);

    /**
     * Production safety:
     * show_services has a partial unique constraint that allows only one
     * primary provider per show + region + offer_type.
     *
     * Never let provider backfill inserts inherit a DB default is_primary=true.
     * Insert/update all automatic rows as non-primary first, then choose exactly
     * one primary after all provider rows exist.
     */
    const { data: existingLink, error: existingLinkErr } = await sb
      .from("show_services")
      .select("show_id,service_id,region,offer_type,is_manual,is_primary")
      .eq("show_id", show_id)
      .eq("service_id", svc.id)
      .ilike("region", region)
      .eq("offer_type", p.offer_type)
      .maybeSingle();

    if (existingLinkErr) throw existingLinkErr;

    if (existingLink) {
      const updatePayload: Record<string, unknown> = {
        provider_show_id,
        source_name: name,
        last_source_sync_at: new Date().toISOString(),
      };

      if (existingLink.is_manual !== true) {
        updatePayload.is_manual = false;
      }

      const { error: linkUpdateErr } = await sb
        .from("show_services")
        .update(updatePayload)
        .eq("show_id", show_id)
        .eq("service_id", svc.id)
        .ilike("region", region)
        .eq("offer_type", p.offer_type);

      if (linkUpdateErr) throw linkUpdateErr;
    } else {
      const { error: linkInsertErr } = await sb.from("show_services").insert({
        show_id,
        service_id: svc.id,
        provider_show_id,
        region,
        offer_type: p.offer_type,
        is_manual: false,
        is_primary: false,
        source_name: name,
        last_source_sync_at: new Date().toISOString(),
      });

      if (linkInsertErr) throw linkInsertErr;
    }

    show_services_upserted++;
  }

  const { data: existingRows, error: existingErr } = await sb
    .from("show_services")
    .select("service_id,region,offer_type,is_manual,is_primary")
    .eq("show_id", show_id)
    .ilike("region", region);

  if (existingErr) throw existingErr;

  const stale = (existingRows ?? []).filter((r) => {
    if (r.is_manual) return false;
    if (r.is_primary) return false;
    const k = `${show_id}|${r.service_id}|${r.region}|${r.offer_type}`;
    return !expectedKeys.has(k);
  });

  for (const r of stale) {
    const { error: delErr } = await sb
      .from("show_services")
      .delete()
      .eq("show_id", show_id)
      .eq("service_id", r.service_id)
      .ilike("region", region)
      .eq("offer_type", r.offer_type)
      .eq("is_manual", false);

    if (delErr) throw delErr;
  }

  const { data: ssRows, error: ssErr } = await sb
    .from("show_services")
    .select("service_id,is_manual,is_primary,offer_type")
    .eq("show_id", show_id)
    .ilike("region", region);

  if (ssErr) throw ssErr;

  const rows = ssRows ?? [];

  async function choosePrimaryForOfferType(
    offerType: OfferType,
  ): Promise<string | null> {
    const typeRows = rows.filter((r) => r.offer_type === offerType);

    const storedPrimaryServiceId = existingPrimaryByOfferType.get(offerType) ?? null;
    if (storedPrimaryServiceId) {
      const stillExists = typeRows.some(
        (r) => r.service_id === storedPrimaryServiceId,
      );
      if (stillExists) return storedPrimaryServiceId;
    }

    const serviceIds = Array.from(
      new Set(typeRows.map((r) => r.service_id).filter(Boolean)),
    );

    if (serviceIds.length === 0) return null;
    if (serviceIds.length === 1) return serviceIds[0];

    const { data: ranks, error: rankErr } = await sb
      .from("service_priority")
      .select("service_id,rank")
      .in("service_id", serviceIds);

    if (rankErr) throw rankErr;

    const rankMap = new Map<string, number>();
    for (const r of ranks ?? []) rankMap.set(r.service_id, r.rank);

    return (
      serviceIds
        .slice()
        .sort((a, b) => {
          const ra = rankMap.has(a) ? rankMap.get(a)! : 9999;
          const rb = rankMap.has(b) ? rankMap.get(b)! : 9999;
          if (ra !== rb) return ra - rb;
          return a.localeCompare(b);
        })[0] ?? null
    );
  }

  let chosenPrimary: string | null = null;
  let chosenPrimaryOfferType: OfferType | null = null;

  const flatratePrimary = await choosePrimaryForOfferType("flatrate");
  if (flatratePrimary) {
    chosenPrimary = flatratePrimary;
    chosenPrimaryOfferType = "flatrate";
  } else {
    const adsPrimary = await choosePrimaryForOfferType("ads");
    if (adsPrimary) {
      chosenPrimary = adsPrimary;
      chosenPrimaryOfferType = "ads";
    }
  }

  const alreadyHasPrimary = rows.some((r) => r.is_primary === true);

  if (!alreadyHasPrimary && chosenPrimary && chosenPrimaryOfferType) {
    const { error: setErr } = await sb
      .from("show_services")
      .update({ is_primary: true })
      .eq("show_id", show_id)
      .ilike("region", region)
      .eq("offer_type", chosenPrimaryOfferType)
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
    chosen_primary_offer_type: chosenPrimaryOfferType,
  };
}

serve(async (req) => {
  console.log("[sync_show] entry", {
    build: BUILD_TAG,
    method: req.method,
    origin: req.headers.get("origin"),
    access_control_request_method: req.headers.get(
      "access-control-request-method",
    ),
    access_control_request_headers: req.headers.get(
      "access-control-request-headers",
    ),
  });

  if (req.method === "OPTIONS") {
    console.log("[sync_show] OPTIONS preflight ok", {
      build: BUILD_TAG,
      origin: req.headers.get("origin"),
      access_control_request_headers: req.headers.get(
        "access-control-request-headers",
      ),
    });

    return empty(req, 200);
  }

  if (req.method !== "POST") {
    return json(req, 405, {
      error: "Method not allowed. Use POST.",
      build: BUILD_TAG,
    });
  }

  try {
    const body = await req.json().catch(() => ({}));

    const tmdb_id =
      typeof body?.tmdb_id === "number"
        ? body.tmdb_id
        : typeof body?.tmdbId === "number"
          ? body.tmdbId
          : null;

    if (!tmdb_id) {
      return json(req, 400, {
        error: "tmdb_id (number) or tmdbId (number) required",
        build: BUILD_TAG,
      });
    }

    const RUNTIME_CONCURRENCY =
      typeof body?.runtimeConcurrency === "number" && body.runtimeConcurrency > 0
        ? Math.min(20, Math.floor(body.runtimeConcurrency))
        : 8;

    const show = await tmdbJson(`/tv/${tmdb_id}`);
    const showTitle = show?.name ?? show?.original_name ?? `tmdb:${tmdb_id}`;
    const poster_url = show?.poster_path
      ? `https://image.tmdb.org/t/p/w500${show.poster_path}`
      : null;
    const backdrop_path = show?.backdrop_path ? String(show.backdrop_path) : null;
    const backdrop_url = backdrop_path
      ? `https://image.tmdb.org/t/p/original${backdrop_path}`
      : null;
    const status = show?.status ?? null;

    const networkCandidates = normalizeNetworkCandidates(
      Array.isArray(show?.networks) ? (show.networks as TmdbNetwork[]) : [],
    );

    const network_service_id = await resolveNetworkServiceId(networkCandidates);

    if (!network_service_id && networkCandidates.length > 0) {
      console.warn("[sync_show] unmapped_tmdb_network", {
        build: BUILD_TAG,
        tmdb_id,
        title: showTitle,
        network_candidates: networkCandidates,
      });
    }

    const { data: existingShowRow, error: existingShowErr } = await sb
      .from("shows")
      .select("id,poster_url,backdrop_url")
      .eq("tmdb_id", tmdb_id)
      .maybeSingle();

    if (existingShowErr) throw existingShowErr;

    let show_id: string;
    let posterUrlUpdated = false;
    let posterUrlPreserved = false;
    let backdropUrlUpdated = false;
    let backdropUrlPreserved = false;

    if (existingShowRow?.id) {
      const updatePayload: Record<string, unknown> = {
        title: showTitle,
        status,
        network_service_id,
      };

      if (poster_url) {
        updatePayload.poster_url = poster_url;
        posterUrlUpdated = existingShowRow.poster_url !== poster_url;
      } else if (existingShowRow.poster_url) {
        posterUrlPreserved = true;
      }

      if (backdrop_path) {
        updatePayload.backdrop_path = backdrop_path;
      }

      if (backdrop_url) {
        updatePayload.backdrop_url = backdrop_url;
        backdropUrlUpdated = existingShowRow.backdrop_url !== backdrop_url;
      } else if (existingShowRow.backdrop_url) {
        backdropUrlPreserved = true;
      }

      const { data: updatedShowRow, error: updateShowErr } = await sb
        .from("shows")
        .update(updatePayload)
        .eq("id", existingShowRow.id)
        .select("id")
        .single();

      if (updateShowErr) throw updateShowErr;
      show_id = updatedShowRow.id;
    } else {
      const { data: insertedShowRow, error: insertShowErr } = await sb
        .from("shows")
        .insert({
          tmdb_id,
          title: showTitle,
          poster_url,
          backdrop_path,
          backdrop_url,
          status,
          network_service_id,
        })
        .select("id")
        .single();

      if (insertShowErr) {
        const code =
          insertShowErr && typeof insertShowErr === "object" && "code" in insertShowErr
            ? String(insertShowErr.code ?? "")
            : "";

        if (code !== "23505") {
          throw insertShowErr;
        }

        const retryUpdatePayload: Record<string, unknown> = {
          title: showTitle,
          status,
          network_service_id,
        };

        if (poster_url) {
          retryUpdatePayload.poster_url = poster_url;
          posterUrlUpdated = true;
        }

        if (backdrop_path) {
          retryUpdatePayload.backdrop_path = backdrop_path;
        }

        if (backdrop_url) {
          retryUpdatePayload.backdrop_url = backdrop_url;
          backdropUrlUpdated = true;
        }

        const { data: retryShowRow, error: retryShowErr } = await sb
          .from("shows")
          .update(retryUpdatePayload)
          .eq("tmdb_id", tmdb_id)
          .select("id")
          .single();

        if (retryShowErr) throw retryShowErr;
        show_id = retryShowRow.id;
      } else {
        show_id = insertedShowRow.id;
        posterUrlUpdated = Boolean(poster_url);
      }
    }

    const provider_backfill = await upsertProvidersUS(show_id, tmdb_id);

    const seasons = Array.isArray(show?.seasons)
      ? show.seasons.filter((s: any) => Number(s?.season_number) > 0)
      : [];

    let upserted = 0;
    let runtimesFetched = 0;
    let nextEpisodeToAirUpserted = 0;
    let nextEpisodeToAirSkippedReason: string | null = null;

    let debug_sample_episode_name: string | null = null;
    let debug_sample_keys: string[] | null = null;

    for (const s of seasons) {
      const seasonNum = Number(s.season_number);
      const seasonData = await tmdbJson(`/tv/${tmdb_id}/season/${seasonNum}`);
      const eps = Array.isArray(seasonData?.episodes)
        ? seasonData.episodes
        : [];

      if (!debug_sample_keys && eps.length > 0) {
        debug_sample_keys = Object.keys(eps[0] ?? {});
        debug_sample_episode_name = (eps[0]?.name ?? null) as string | null;
      }

      const filtered = eps.filter((e: any) => e?.air_date && e?.episode_number);

      const rowResults = await mapLimit(
        filtered,
        RUNTIME_CONCURRENCY,
        async (e: any) =>
          await buildEpisodeRow({
            show_id,
            tmdb_id,
            seasonNum,
            episode: {
              ...e,
              season_number: seasonNum,
              episode_number: Number(e.episode_number),
            },
          }),
      );

      const rows = rowResults
        .map((result) => result.row)
        .filter(Boolean) as Record<string, unknown>[];

      runtimesFetched += rowResults.filter((result) => result.runtimeFetched)
        .length;

      if (!rows.length) continue;

      const { error: epErr } = await sb.from("episodes").upsert(rows, {
        onConflict: "show_id,season,episode",
      });

      if (epErr) throw epErr;
      upserted += rows.length;
    }

    const nextEpisode = show?.next_episode_to_air as TmdbEpisode | null;

    if (!nextEpisode) {
      nextEpisodeToAirSkippedReason = "tmdb_next_episode_to_air_missing";
    } else {
      const nextSeasonNum = Number(nextEpisode?.season_number);
      const nextEpisodeNum = Number(nextEpisode?.episode_number);
      const nextAirDate = toISODateOnly(nextEpisode?.air_date);

      if (!Number.isFinite(nextSeasonNum) || nextSeasonNum <= 0) {
        nextEpisodeToAirSkippedReason = "invalid_next_episode_season_number";
      } else if (!Number.isFinite(nextEpisodeNum) || nextEpisodeNum <= 0) {
        nextEpisodeToAirSkippedReason = "invalid_next_episode_episode_number";
      } else if (!nextAirDate) {
        nextEpisodeToAirSkippedReason = "invalid_next_episode_air_date";
      } else {
        const nextRowResult = await buildEpisodeRow({
          show_id,
          tmdb_id,
          seasonNum: nextSeasonNum,
          episode: {
            ...nextEpisode,
            season_number: nextSeasonNum,
            episode_number: nextEpisodeNum,
            air_date: nextAirDate,
          },
        });

        if (nextRowResult.runtimeFetched) {
          runtimesFetched++;
        }

        if (nextRowResult.row) {
          const { error: nextEpErr } = await sb.from("episodes").upsert(
            [nextRowResult.row],
            {
              onConflict: "show_id,season,episode",
            },
          );

          if (nextEpErr) throw nextEpErr;

          nextEpisodeToAirUpserted = 1;

          console.log("[sync_show] next_episode_to_air upserted", {
            build: BUILD_TAG,
            tmdb_id,
            show_id,
            season: nextSeasonNum,
            episode: nextEpisodeNum,
            air_date: nextAirDate,
          });
        } else {
          nextEpisodeToAirSkippedReason = "next_episode_row_build_returned_null";
        }
      }
    }

    console.log("[sync_show] success", {
      build: BUILD_TAG,
      tmdb_id,
      show_id,
      episodes_upserted: upserted,
      next_episode_to_air_upserted: nextEpisodeToAirUpserted,
      next_episode_to_air_skipped_reason: nextEpisodeToAirSkippedReason,
      runtimes_fetched_from_episode_detail: runtimesFetched,
      poster_url,
      poster_url_updated: posterUrlUpdated,
      poster_url_preserved: posterUrlPreserved,
      backdrop_path,
      backdrop_url,
      backdrop_url_updated: backdropUrlUpdated,
      backdrop_url_preserved: backdropUrlPreserved,
    });

    return json(req, 200, {
      ok: true,
      build: BUILD_TAG,
      show_id,
      tmdb_id,
      show_title: showTitle,
      network_candidates: networkCandidates,
      network_service_id,
      provider_backfill,
      episodes_upserted: upserted,
      next_episode_to_air_upserted: nextEpisodeToAirUpserted,
      next_episode_to_air_skipped_reason: nextEpisodeToAirSkippedReason,
      runtimes_fetched_from_episode_detail: runtimesFetched,
      poster_url,
      poster_url_updated: posterUrlUpdated,
      poster_url_preserved: posterUrlPreserved,
      backdrop_path,
      backdrop_url,
      backdrop_url_updated: backdropUrlUpdated,
      backdrop_url_preserved: backdropUrlPreserved,
      runtime_concurrency: RUNTIME_CONCURRENCY,
      debug_sample_episode_name,
      debug_sample_keys,
    });
  } catch (e) {
    const errObj =
      e && typeof e === "object" ? (e as Record<string, unknown>) : null;

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

    console.error("[sync_show] ERROR", {
      build: BUILD_TAG,
      ...details,
    });

    return json(req, 500, {
      error: (details as any)?.message ?? String(e),
      details,
      build: BUILD_TAG,
    });
  }
});