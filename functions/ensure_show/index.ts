// supabase/functions/ensure_show/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const TMDB_KEY = Deno.env.get("TMDB_API_KEY") ?? "";
const API_BASE = "https://api.themoviedb.org/3";
const BUILD_TAG = "ensure_show_v2026-04-26_backdrop_v50";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function getBearerToken(req: Request) {
  const h = req.headers.get("authorization") ?? "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
}

async function tmdbFetch(path: string) {
  const url = `${API_BASE}${path}${path.includes("?") ? "&" : "?"}api_key=${TMDB_KEY}`;
  const r = await fetch(url);
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`TMDB ${r.status}: ${t || r.statusText}`);
  }
  return await r.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed", build: BUILD_TAG }, 405);

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return json({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY", build: BUILD_TAG }, 500);
  }
  if (!TMDB_KEY) {
    return json({ error: "Missing TMDB_API_KEY", build: BUILD_TAG }, 500);
  }

  // Edge Functions do not have a cookie session, so validate the user JWT explicitly.
  const token = getBearerToken(req);
  if (!token) return json({ error: "Missing Authorization Bearer token", build: BUILD_TAG }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: userRes, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userRes?.user) {
    return json(
      { error: "Invalid user token", details: userErr?.message ?? null, build: BUILD_TAG },
      401
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body", build: BUILD_TAG }, 400);
  }

  const tmdb_id = Number(body?.tmdb_id);
  if (!Number.isFinite(tmdb_id) || tmdb_id <= 0) {
    return json(
      { error: "tmdb_id is required and must be a positive number", build: BUILD_TAG },
      400
    );
  }

  let tv: any;
  try {
    tv = await tmdbFetch(`/tv/${tmdb_id}?language=en-US`);
  } catch (e: any) {
    return json({ error: e?.message ?? "TMDB fetch failed", build: BUILD_TAG }, 502);
  }

  const title = String(tv?.name ?? "").trim();
  const status = tv?.status ? String(tv.status) : null;
  const poster_path = tv?.poster_path ? String(tv.poster_path) : null;
  const backdrop_path = tv?.backdrop_path ? String(tv.backdrop_path) : null;
  const poster_url = poster_path ? `https://image.tmdb.org/t/p/w500${poster_path}` : null;
  const backdrop_url = backdrop_path
    ? `https://image.tmdb.org/t/p/original${backdrop_path}`
    : null;

  if (!title) return json({ error: "TMDB returned no title/name", build: BUILD_TAG }, 502);

  const { data: up, error: upErr } = await admin
    .from("shows")
    .upsert(
      {
        tmdb_id,
        title,
        status,
        poster_url,
        backdrop_path,
        backdrop_url,
      },
      { onConflict: "tmdb_id" }
    )
    .select("id, tmdb_id, title, status, poster_url, backdrop_path, backdrop_url")
    .maybeSingle();

  if (upErr) {
    return json({ error: "DB upsert failed", details: upErr.message, build: BUILD_TAG }, 500);
  }

  return json({ ok: true, build: BUILD_TAG, show: up }, 200);
});
