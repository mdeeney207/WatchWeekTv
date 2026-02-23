import { supabase } from "./supabase";

async function getUid(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return null;
  return data.user.id;
}

export async function logOpenService(params: {
  episodeId: string;
  serviceId?: string | null;
}) {
  const uid = await getUid();
  if (!uid) return;

  const { error } = await supabase.from("user_episode_actions").insert({
    user_id: uid,
    episode_id: params.episodeId,
    action: "open_service",
    service_id: params.serviceId ?? null,
  });

  if (error) console.log("[telemetry] open_service insert failed:", error.message);
}

export async function logWatched(params: { episodeId: string }) {
  const uid = await getUid();
  if (!uid) return;

  const { error } = await supabase.from("user_episode_actions").insert({
    user_id: uid,
    episode_id: params.episodeId,
    action: "watched",
    service_id: null,
  });

  if (error) console.log("[telemetry] watched insert failed:", error.message);
}
