// mobile/src/lib/syncShow.ts
import { supabase } from "./supabase";

export async function syncShow(tmdb_id: number, runtimeConcurrency = 8) {
  const { data, error } = await supabase.functions.invoke("sync_show", {
    body: { tmdb_id, runtimeConcurrency },
  });

  if (error) throw error;
  if (!data?.ok || !data?.show_id) {
    throw new Error(`sync_show failed: ${JSON.stringify(data)}`);
  }

  return data as {
    ok: true;
    show_id: string;
    build: string;
    provider_backfill?: unknown;
  };
}
