// supabase/functions/tmdb_proxy/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const TMDB_KEY = Deno.env.get("TMDB_API_KEY") ?? "";
const API_BASE = "https://api.themoviedb.org/3";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    },
  });
}

function withKey(url: URL) {
  url.searchParams.set("api_key", TMDB_KEY);
  return url;
}

async function fetchWithTimeout(url: string, ms = 12000) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), ms);
  try {
    return await fetch(url, { method: "GET", signal: ac.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function tmdbGet(path: string, query?: Record<string, any>) {
  if (!TMDB_KEY) {
    const err = new Error("TMDB_API_KEY missing in Edge runtime");
    (err as any).status = 500;
    (err as any).payload = { hint: "Set TMDB_API_KEY in Supabase Edge Function secrets" };
    throw err;
  }

  const url = new URL(API_BASE + path);

  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }

  const finalUrl = withKey(url).toString();
  const res = await fetchWithTimeout(finalUrl, 12000);

  const text = await res.text();
  let parsed: any = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { raw: text };
  }

  if (!res.ok) {
    const err = new Error(`TMDB error ${res.status}`);
    (err as any).status = res.status;
    (err as any).payload = parsed;
    throw err;
  }

  return parsed;
}

serve(async (req) => {
  console.log("[tmdb_proxy] HIT", {
    method: req.method,
    ts: Date.now(),
    hasKey: !!Deno.env.get("TMDB_API_KEY"),
  });

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json({ error: "Use POST" }, 405);
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const reqId = crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  try {
    // --- Preferred API: action-based routing ---
    if (body?.action) {
      const action = String(body.action);

      if (action === "search_tv") {
        const q = String(body.query ?? "").trim();
        console.log(`[tmdb_proxy:${reqId}] search_tv`, { qLen: q.length, q: q.slice(0, 80) });

        if (!q) return json({ results: [] }, 200);

        // ✅ DO NOT FAIL-SOFT. If TMDB breaks, return a real error to the client.
        const data = await tmdbGet("/search/tv", { query: q });

        return json(
          {
            results: data?.results ?? [],
            meta: { req_id: reqId, count: (data?.results ?? []).length },
          },
          200
        );
      }

      if (action === "tv_details") {
        const tmdbId = Number(body.tmdbId);
        if (!tmdbId) return json({ error: "Missing tmdbId" }, 400);

        const data = await tmdbGet(`/tv/${tmdbId}`);
        return json(data, 200);
      }

      if (action === "tv_season") {
        const tmdbId = Number(body.tmdbId);
        const seasonNumber = Number(body.seasonNumber);

        if (!tmdbId || Number.isNaN(seasonNumber)) {
          return json({ error: "Missing tmdbId/seasonNumber" }, 400);
        }

        const data = await tmdbGet(`/tv/${tmdbId}/season/${seasonNumber}`);
        return json(data, 200);
      }

      // ✅ NEW: Watch providers for a TV show (US availability data lives under results.US)
      // TMDB endpoint: GET /tv/{tmdbId}/watch/providers
      if (action === "tv_watch_providers") {
        const tmdbId = Number(body.tmdbId);
        if (!tmdbId) return json({ error: "Missing tmdbId" }, 400);

        const data = await tmdbGet(`/tv/${tmdbId}/watch/providers`);
        return json(data, 200);
      }

      return json({ error: `Unknown action: ${action}` }, 400);
    }

    // --- Back-compat API: path/query routing ---
    if (body?.path) {
      const path = String(body.path);
      const query =
        body?.query && typeof body.query === "object"
          ? body.query
          : body?.params && typeof body.params === "object"
            ? body.params
            : undefined;

      if (path.startsWith("/search/")) {
        // ✅ DO NOT FAIL-SOFT
        const data = await tmdbGet(path, query);
        return json({ results: data?.results ?? [], meta: { req_id: reqId } }, 200);
      }

      const data = await tmdbGet(path, query);
      return json(data, 200);
    }

    return json({ error: "Missing action or path" }, 400);
  } catch (e: any) {
    const status = Number(e?.status ?? 500);
    const payload = e?.payload ?? null;

    console.log(`[tmdb_proxy:${reqId}] error:`, e?.message ?? e, payload ?? "");

    const httpStatus = status >= 400 && status <= 599 ? status : 500;

    return json(
      {
        error: e?.message ?? "tmdb_proxy failed",
        status: httpStatus,
        req_id: reqId,
        payload,
      },
      httpStatus
    );
  }
});
