// supabase/functions/backfill_episode_details/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/**
 * backfill_episode_details (admin)
 * ================================
 * Purpose:
 * - Fill missing episodes.title and/or episodes.runtime using TMDB episode details:
 *     /tv/{tmdb_id}/season/{season}/episode/{episode}
 *
 * Security model (REQUIRED):
 * - Deploy with --no-verify-jwt
 * - Require a shared secret header:
 *     x-backfill-secret: <BACKFILL_SECRET>
 *
 * Secrets to set:
 *   supabase secrets set SUPABASE_URL="https://<ref>.supabase.co"
 *   supabase secrets set SUPABASE_SERVICE_ROLE_KEY="xxxxx"
 *   supabase secrets set TMDB_API_KEY="xxxxx"
 *   supabase secrets set BACKFILL_SECRET="super-long-random-string"
 *
 * Deploy:
 *   supabase functions deploy backfill_episode_details --no-verify-jwt
 *
 * Call (example):
 *   POST /functions/v1/backfill_episode_details
 *   Headers:
 *     x-backfill-secret: <BACKFILL_SECRET>
 *   Body:
 *     {
 *       "mode": "window",
 *       "fromUTC": "2026-01-01",
 *       "toUTC": "2026-12-31",
 *       "limit": 200,
 *       "offset": 0,
 *       "dryRun": true,
 *       "throttleMs": 160,
 *       "allowOverwrite": false,
 *       "overwritePlaceholdersOnly": true
 *     }
 *
 * Modes:
 * - window: pull candidates by air_date_utc window (+ runtime/title null filters)
 * - ids:    explicit episodeIds[]
 * - nulls:  scan episodes where runtime/title are null (no date window) (paged)
 *
 * Safety rules (default):
 * - Never write null/empty title
 * - Never write null/0 runtime
 * - Do not overwrite existing non-null fields unless allowOverwrite=true
 * - Optional: overwrite placeholders only ("Episode 1", etc.)
 */

// ------------------------------------------------------------
// ENV (CRITICAL)
// ------------------------------------------------------------
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const TMDB_API_KEY = Deno.env.get("TMDB_API_KEY") ?? "";
const BACKFILL_SECRET = Deno.env.get("BACKFILL_SECRET") ?? "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (set as function secrets/env).");
}
if (!TMDB_API_KEY) {
  throw new Error("Missing TMDB_API_KEY (set as function secret).");
}
if (!BACKFILL_SECRET) {
  throw new Error("Missing BACKFILL_SECRET (set as function secret).");
}

// Service-role client (bypasses RLS; ONLY in server-side function)
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------
function json(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeRuntime(v: unknown): number | null {
  // TMDB usually returns runtime as number, but we guard hard.
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return Math.round(v);

  // Some TMDB endpoints return arrays (episode_run_time on show), keep guard anyway.
  if (Array.isArray(v)) {
    const n = v.find((x) => typeof x === "number" && Number.isFinite(x) && x > 0);
    return typeof n === "number" ? Math.round(n) : null;
  }
  return null;
}

function normalizeTitle(v: unknown): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  return s;
}

function isPlaceholderTitle(title: string | null): boolean {
  if (!title) return false;
  const t = title.trim();
  if (!t) return false;
  return /^episode\s+\d+$/i.test(t) || /^ep\s*\d+$/i.test(t);
}

async function tmdbEpisodeDetails(tmdbId: number, season: number, episode: number) {
  const url =
    `https://api.themoviedb.org/3/tv/${tmdbId}/season/${season}/episode/${episode}` +
    `?api_key=${encodeURIComponent(TMDB_API_KEY)}&language=en-US`;

  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `TMDB ${res.status} for tv/${tmdbId} S${season}E${episode} :: ${body.slice(0, 200)}`
    );
  }
  return await res.json();
}

// ------------------------------------------------------------
// TYPES
// ------------------------------------------------------------
type EpisodeRow = {
  id: string;
  show_id: string;
  season: number;
  episode: number;
  air_date_utc: string | null;
  title: string | null;
  runtime: number | null;
};

type Mode = "window" | "ids" | "nulls";

// ------------------------------------------------------------
// QUERY BUILDERS
// ------------------------------------------------------------
async function fetchEpisodesByIds(episodeIds: string[]) {
  const { data, error } = await sb
    .from("episodes")
    .select("id, show_id, season, episode, air_date_utc, title, runtime")
    .in("id", episodeIds)
    .limit(Math.min(episodeIds.length, 1000)); // guard

  if (error) throw error;
  return (data ?? []) as EpisodeRow[];
}

async function fetchEpisodesByWindow(args: {
  fromUTC: string;
  toUTC: string;
  limit: number;
  offset: number;
}) {
  const { fromUTC, toUTC, limit, offset } = args;

  // We only care about candidates missing runtime or title.
  // NOTE: "offset" requires deterministic ordering.
  const { data, error } = await sb
    .from("episodes")
    .select("id, show_id, season, episode, air_date_utc, title, runtime")
    .gte("air_date_utc", `${fromUTC}T00:00:00Z`)
    .lte("air_date_utc", `${toUTC}T23:59:59Z`)
    .or("runtime.is.null,title.is.null")
    .order("air_date_utc", { ascending: true })
    .order("id", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return (data ?? []) as EpisodeRow[];
}

async function fetchEpisodesNullScan(args: { limit: number; offset: number }) {
  const { limit, offset } = args;

  const { data, error } = await sb
    .from("episodes")
    .select("id, show_id, season, episode, air_date_utc, title, runtime")
    .or("runtime.is.null,title.is.null")
    .order("air_date_utc", { ascending: true, nullsFirst: false })
    .order("id", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return (data ?? []) as EpisodeRow[];
}

async function fetchTmdbMapForShowIds(showIds: string[]) {
  const uniq = Array.from(new Set(showIds)).filter(Boolean);
  if (uniq.length === 0) return new Map<string, number>();

  const { data, error } = await sb.from("shows").select("id, tmdb_id").in("id", uniq);
  if (error) throw error;

  const tmdbByShow = new Map<string, number>();
  for (const s of data ?? []) {
    if (s?.id && typeof (s as any)?.tmdb_id === "number") tmdbByShow.set((s as any).id, (s as any).tmdb_id);
  }
  return tmdbByShow;
}

// ------------------------------------------------------------
// FUNCTION
// ------------------------------------------------------------
serve(async (req) => {
  // CORS (optional but helpful for tooling)
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "content-type, x-backfill-secret",
        "access-control-allow-methods": "POST, OPTIONS",
      },
    });
  }

  try {
    // ------------------------------
    // METHOD GUARD
    // ------------------------------
    if (req.method !== "POST") return json(405, { ok: false, error: "Use POST" });

    // ------------------------------
    // SECRET GATE (REQUIRED)
    // ------------------------------
    const gotSecret = req.headers.get("x-backfill-secret") ?? "";
    if (gotSecret !== BACKFILL_SECRET) {
      return json(401, { ok: false, error: "Unauthorized" });
    }

    // ------------------------------
    // INPUT PARSE
    // ------------------------------
    const body = await req.json().catch(() => ({}));

    const mode = (body?.mode as Mode | undefined) ?? "window";

    const fromUTC = body?.fromUTC as string | undefined;
    const toUTC = body?.toUTC as string | undefined;

    const limit = Number.isFinite(body?.limit) ? Math.max(1, Math.min(500, Number(body.limit))) : 200;
    const offset = Number.isFinite(body?.offset) ? Math.max(0, Number(body.offset)) : 0;

    const dryRun = body?.dryRun !== undefined ? Boolean(body.dryRun) : true;
    const allowOverwrite = body?.allowOverwrite !== undefined ? Boolean(body.allowOverwrite) : false;

    // If true, we ONLY overwrite title when it's a placeholder like "Episode 1".
    // This is ignored unless allowOverwrite=true OR title is placeholder and overwritePlaceholdersOnly=true.
    const overwritePlaceholdersOnly =
      body?.overwritePlaceholdersOnly !== undefined ? Boolean(body.overwritePlaceholdersOnly) : true;

    const throttleMs = Number.isFinite(body?.throttleMs) ? Math.max(0, Number(body.throttleMs)) : 160;

    const episodeIds = body?.episodeIds as string[] | undefined;

    // ------------------------------
    // 1) Pull candidate episodes
    // ------------------------------
    let episodes: EpisodeRow[] = [];

    if (mode === "ids") {
      if (!Array.isArray(episodeIds) || episodeIds.length === 0) {
        return json(400, { ok: false, error: 'mode="ids" requires episodeIds[]' });
      }
      episodes = await fetchEpisodesByIds(episodeIds);
    } else if (mode === "window") {
      if (!fromUTC || !toUTC) {
        return json(400, { ok: false, error: 'mode="window" requires fromUTC and toUTC' });
      }
      episodes = await fetchEpisodesByWindow({ fromUTC, toUTC, limit, offset });
    } else if (mode === "nulls") {
      episodes = await fetchEpisodesNullScan({ limit, offset });
    } else {
      return json(400, { ok: false, error: `Unknown mode: ${String(mode)}` });
    }

    if (episodes.length === 0) {
      return json(200, {
        ok: true,
        dryRun,
        mode,
        count: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        nextOffset: offset, // nothing moved
        message: "No candidates",
      });
    }

    // ------------------------------
    // 2) Map show_id -> tmdb_id (from public.shows)
    // ------------------------------
    const tmdbByShow = await fetchTmdbMapForShowIds(episodes.map((e) => e.show_id));

    // ------------------------------
    // 3) Backfill loop
    // ------------------------------
    const results: Array<Record<string, unknown>> = [];
    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (const e of episodes) {
      const tmdbId = tmdbByShow.get(e.show_id);

      if (!tmdbId) {
        failed++;
        results.push({
          id: e.id,
          ok: false,
          error: "Missing tmdb_id for show_id",
          show_id: e.show_id,
        });
        continue;
      }

      // Short-circuit if nothing to do (unless allowOverwrite)
      if (!allowOverwrite && e.title && e.runtime != null) {
        skipped++;
        results.push({ id: e.id, ok: true, skipped: true, reason: "Already has title+runtime" });
        continue;
      }

      try {
        const detail = await tmdbEpisodeDetails(tmdbId, e.season, e.episode);

        // TMDB uses "name" for episode title
        const tmdbTitle = normalizeTitle(detail?.name ?? detail?.title);
        const tmdbRuntime = normalizeRuntime(detail?.runtime);

        const patch: Record<string, unknown> = {};

        // ---- TITLE RULES
        const titleIsPlaceholder = isPlaceholderTitle(e.title);

        if (allowOverwrite) {
          if (overwritePlaceholdersOnly) {
            // Only overwrite placeholders (keep real titles intact)
            if (titleIsPlaceholder && tmdbTitle) patch.title = tmdbTitle;
          } else {
            // Overwrite whatever, but only with a real tmdbTitle
            if (tmdbTitle) patch.title = tmdbTitle;
          }
        } else {
          // Default safe: only fill missing
          if (!e.title && tmdbTitle) patch.title = tmdbTitle;
        }

        // ---- RUNTIME RULES
        if (allowOverwrite) {
          // Overwrite only with a valid runtime
          if (tmdbRuntime) patch.runtime = tmdbRuntime;
        } else {
          // Default safe: only fill missing
          if (e.runtime == null && tmdbRuntime) patch.runtime = tmdbRuntime;
        }

        if (Object.keys(patch).length === 0) {
          skipped++;
          results.push({
            id: e.id,
            ok: true,
            skipped: true,
            reason: "No usable TMDB fields OR safe rules prevented overwrite",
          });
        } else if (dryRun) {
          updated++;
          results.push({ id: e.id, ok: true, dryRun: true, patch });
        } else {
          const { error: upErr } = await sb.from("episodes").update(patch).eq("id", e.id);
          if (upErr) throw upErr;
          updated++;
          results.push({ id: e.id, ok: true, patch });
        }
      } catch (err: unknown) {
        failed++;
        results.push({ id: e.id, ok: false, error: String((err as any)?.message ?? err) });
      }

      if (throttleMs > 0) await sleep(throttleMs);
    }

    // ------------------------------
    // RESPONSE
    // ------------------------------
    return json(200, {
      ok: true,
      dryRun,
      mode,
      allowOverwrite,
      overwritePlaceholdersOnly,
      throttleMs,
      count: episodes.length,
      offset,
      nextOffset: offset + episodes.length,
      updated,
      skipped,
      failed,
      results,
    });
  } catch (e: unknown) {
    return json(500, { ok: false, error: String((e as any)?.message ?? e) });
  }
});
