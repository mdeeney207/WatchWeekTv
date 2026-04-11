import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import {
  findWatchmodeTitleByTmdb,
  getWatchmodeSources,
} from "@/lib/watchmode/watchmodeClient";
import { mapWatchmodeSourceToShowService } from "@/lib/watchmode/mapWatchmodeSourceToShowService";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
}

if (!serviceRoleKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

type ShowRow = {
  id: string;
  title: string | null;
  tmdb_id: number | null;
};

type StreamingServiceRow = {
  id: string;
  name: string | null;
};

type ShowServiceRow = {
  id: string;
  show_id: string;
  service_id: string | null;
  streaming_services: StreamingServiceRow | StreamingServiceRow[] | null;
};

function normalizeProviderName(value?: string | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\+/g, " plus ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function namesMatch(a?: string | null, b?: string | null) {
  const aa = normalizeProviderName(a);
  const bb = normalizeProviderName(b);

  if (!aa || !bb) return false;
  if (aa === bb) return true;

  const aliases: Record<string, string[]> = {
    hulu: ["hulu"],
    netflix: ["netflix"],
    max: ["max", "hbo max", "hbo"],
    "prime video": ["prime video", "amazon", "amazon prime video", "prime"],
    "apple tv": ["apple tv", "appletv", "apple tv plus", "apple tv+"],
    peacock: ["peacock", "peacock premium"],
    "paramount plus": ["paramount plus", "paramount+"],
    disney: ["disney", "disney plus", "disney+"],
    "fubo tv": ["fubo tv", "fubotv"],
    vudu: ["vudu", "fandango at home", "fandangoathome"],
  };

  const allGroups = Object.values(aliases);
  return allGroups.some((group) => group.includes(aa) && group.includes(bb));
}

function getStreamingServiceName(
  value: StreamingServiceRow | StreamingServiceRow[] | null
) {
  if (!value) return null;
  if (Array.isArray(value)) {
    return value[0]?.name ?? null;
  }
  return value.name ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const showId = String(body?.showId ?? "").trim();

    if (!showId) {
      return NextResponse.json(
        { error: "showId is required" },
        { status: 400 }
      );
    }

    const { data: show, error: showError } = await supabase
      .from("shows")
      .select("id, title, tmdb_id")
      .eq("id", showId)
      .maybeSingle<ShowRow>();

    if (showError) {
      return NextResponse.json(
        { error: `Failed to load show: ${showError.message}` },
        { status: 500 }
      );
    }

    if (!show) {
      return NextResponse.json({ error: "Show not found" }, { status: 404 });
    }

    if (!show.tmdb_id) {
      return NextResponse.json(
        { error: "Show is missing tmdb_id", show },
        { status: 400 }
      );
    }

    const watchmodeTitle = await findWatchmodeTitleByTmdb(show.tmdb_id);

    if (!watchmodeTitle?.id) {
      return NextResponse.json(
        { error: "No Watchmode title found", show },
        { status: 404 }
      );
    }

    const sources = await getWatchmodeSources(watchmodeTitle.id, "US");

    const { data: showServices, error: servicesError } = await supabase
      .from("show_services")
      .select(
        `
          id,
          show_id,
          service_id,
          streaming_services (
            id,
            name
          )
        `
      )
      .eq("show_id", showId)
      .returns<ShowServiceRow[]>();

    if (servicesError) {
      return NextResponse.json(
        { error: `Failed to load show_services: ${servicesError.message}` },
        { status: 500 }
      );
    }

    const updates: Array<{
      show_service_id: string;
      service_name: string | null;
      matched_source_name: string | null;
      updated: boolean;
      web_url: string | null;
    }> = [];

    for (const row of showServices ?? []) {
      const serviceName = getStreamingServiceName(row.streaming_services);

      const matchedSource =
        sources.find((source) => namesMatch(source.name, serviceName)) ?? null;

      if (!matchedSource) {
        updates.push({
          show_service_id: row.id,
          service_name: serviceName,
          matched_source_name: null,
          updated: false,
          web_url: null,
        });
        continue;
      }

      const patch = mapWatchmodeSourceToShowService(matchedSource);

      const { error: updateError } = await supabase
        .from("show_services")
        .update(patch)
        .eq("id", row.id);

      if (updateError) {
        return NextResponse.json(
          {
            error: `Failed updating show_service ${row.id}: ${updateError.message}`,
          },
          { status: 500 }
        );
      }

      updates.push({
        show_service_id: row.id,
        service_name: serviceName,
        matched_source_name: matchedSource.name ?? null,
        updated: true,
        web_url: patch.web_url,
      });
    }

    return NextResponse.json({
      ok: true,
      show,
      watchmode_title: watchmodeTitle,
      source_count: sources.length,
      updates,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}