// web/app/api/watch/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function safeSurface(value: string | null) {
  const v = String(value ?? "tv_page").trim().toLowerCase();

  const allowed = new Set([
    "tv_page",
    "where_to_watch",
    "home",
    "calendar",
    "search",
    "email",
    "sms",
    "notification",
    "unknown",
  ]);

  return allowed.has(v) ? v : "unknown";
}

function safeCountry(value: string | null) {
  const v = String(value ?? "US").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(v) ? v : "US";
}

function safeProvider(value: string | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const show = searchParams.get("show");
    const provider = safeProvider(searchParams.get("provider"));
    const surface = safeSurface(searchParams.get("surface"));
    const country = safeCountry(searchParams.get("country"));

    if (!show || !provider) {
      return NextResponse.json(
        { error: "Missing show or provider" },
        { status: 400 }
      );
    }

    const tmdbShowId = Number(show);
    if (!Number.isFinite(tmdbShowId) || tmdbShowId <= 0) {
      return NextResponse.json({ error: "Invalid show id" }, { status: 400 });
    }

    const supabase = createClient(
      mustEnv("NEXT_PUBLIC_SUPABASE_URL"),
      mustEnv("SUPABASE_SERVICE_ROLE_KEY"),
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const { data: link, error: linkError } = await supabase
      .from("provider_links")
      .select("destination_url, affiliate_url")
      .eq("tmdb_show_id", tmdbShowId)
      .eq("service_slug", provider)
      .eq("country_code", country)
      .eq("is_active", true)
      .maybeSingle();

    if (linkError) {
      console.error("[api/watch] provider_links lookup failed:", linkError);
      return NextResponse.json(
        { error: "Provider link lookup failed" },
        { status: 500 }
      );
    }

    if (!link) {
      return NextResponse.json(
        { error: "Provider link not found" },
        { status: 404 }
      );
    }

    const destination = link.affiliate_url ?? link.destination_url;

    if (!destination) {
      return NextResponse.json(
        { error: "No destination URL available" },
        { status: 404 }
      );
    }

    let destinationUrl: URL;
    try {
      destinationUrl = new URL(destination);
    } catch {
      return NextResponse.json(
        { error: "Invalid destination URL" },
        { status: 500 }
      );
    }

    const destinationType = link.affiliate_url ? "affiliate" : "direct";

    // Best-effort click logging.
    // Do not block redirect if analytics insert fails.
    const { error: clickError } = await supabase.from("provider_clicks").insert({
      tmdb_show_id: tmdbShowId,
      service_slug: provider,
      country_code: country,
      source_surface: surface,
      destination_type: destinationType,
      clicked_at: new Date().toISOString(),
    });

    if (clickError) {
      console.error("[api/watch] provider_clicks insert failed:", clickError);
    }

    return NextResponse.redirect(destinationUrl, 302);
  } catch (err) {
    console.error("[api/watch] redirect failed:", err);

    return NextResponse.json({ error: "Redirect failed" }, { status: 500 });
  }
}