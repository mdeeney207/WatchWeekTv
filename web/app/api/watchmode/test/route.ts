import { NextResponse } from "next/server";
import {
  findWatchmodeTitleByTmdb,
  getWatchmodeSources,
} from "@/lib/watchmode/watchmodeClient";

export async function GET() {
  try {
    const TMDB_ID = 79744; // The Rookie

    const title = await findWatchmodeTitleByTmdb(TMDB_ID);

    if (!title) {
      return NextResponse.json({ error: "No title found" }, { status: 404 });
    }

    const sources = await getWatchmodeSources(title.id, "US");

    return NextResponse.json({
      watchmode_title: title,
      sources,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}