import type { WatchmodeSource } from "./watchmodeClient";

function normalizeDeeplink(value?: string | null) {
  const v = String(value ?? "").trim();
  if (!v) return null;

  if (v.toLowerCase().includes("deeplinks available for paid plans only")) {
    return null;
  }

  return v;
}

function normalizeUrl(value?: string | null) {
  const v = String(value ?? "").trim();
  if (!v) return null;
  if (!/^https?:\/\//i.test(v)) return null;
  return v;
}

export type ShowServiceWatchmodePatch = {
  watchmode_source_id: number | null;
  source_name: string | null;
  source_type: string | null;
  source_region: string | null;
  web_url: string | null;
  ios_url: string | null;
  android_url: string | null;
  source_price: number | null;
  source_seasons: number | null;
  source_episodes: number | null;
  last_source_sync_at: string;
};

export function mapWatchmodeSourceToShowService(
  source: WatchmodeSource
): ShowServiceWatchmodePatch {
  return {
    watchmode_source_id:
      typeof source.source_id === "number" ? source.source_id : null,
    source_name: source.name?.trim() || null,
    source_type: source.type?.trim() || null,
    source_region: source.region?.trim() || null,
    web_url: normalizeUrl(source.web_url),
    ios_url: normalizeDeeplink(source.ios_url),
    android_url: normalizeDeeplink(source.android_url),
    source_price: typeof source.price === "number" ? source.price : null,
    source_seasons: typeof source.seasons === "number" ? source.seasons : null,
    source_episodes:
      typeof source.episodes === "number" ? source.episodes : null,
    last_source_sync_at: new Date().toISOString(),
  };
}