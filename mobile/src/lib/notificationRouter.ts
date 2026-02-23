// mobile/src/lib/notificationRouter.ts
import * as Notifications from "expo-notifications";
import { supabase } from "./supabase";
import { openEpisodeLinks } from "./openEpisode";

type Payload = {
  kind?: string;
  episode_id?: string;
  show_id?: string;
  service_id?: string;
};

// Prevent double-open when both:
// - addNotificationResponseReceivedListener fires
// - getLastNotificationResponseAsync returns same response
let lastHandledKey: string | null = null;
let lastHandledAt = 0;

function shouldHandleOnce(key: string) {
  const now = Date.now();
  if (lastHandledKey === key && now - lastHandledAt < 1500) return false;
  lastHandledKey = key;
  lastHandledAt = now;
  return true;
}

async function fetchEnrichedEpisode(
  episodeId: string,
  showId?: string,
  serviceId?: string
) {
  // Fast path: tonight view
  const { data: rowTonight, error: errTonight } = await supabase
    .from("v_tonight_episodes")
    .select("*")
    .eq("episode_id", episodeId)
    .maybeSingle();

  if (errTonight) console.log("[notif] v_tonight_episodes lookup error:", errTonight.message);
  if (rowTonight) return { row: rowTonight as any, source: "v_tonight_episodes" as const };

  // Optional: week view exists in your DB (keeps things rich even if not "tonight")
  const { data: rowWeek, error: errWeek } = await supabase
    .from("v_week_episodes")
    .select("*")
    .eq("episode_id", episodeId)
    .maybeSingle();

  if (errWeek) console.log("[notif] v_week_episodes lookup error:", errWeek.message);
  if (rowWeek) return { row: rowWeek as any, source: "v_week_episodes" as const };

  // Fallback: join from base tables
  const { data: ep, error: epErr } = await supabase
    .from("episodes")
    .select("id, show_id, title, season, episode, air_date, air_datetime_et")
    .eq("id", episodeId)
    .maybeSingle();

  if (epErr) console.log("[notif] episodes lookup error:", epErr.message);
  if (!ep) return null;

  // Service selection preference: payload service_id > user_show_services > show_services
  let pickedServiceId: string | null = serviceId ?? null;

  if (!pickedServiceId) {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;

    if (userId) {
      const { data: uss, error: ussErr } = await supabase
        .from("user_show_services")
        .select("service_id")
        .eq("user_id", userId)
        .eq("show_id", ep.show_id)
        .maybeSingle();

      if (ussErr) console.log("[notif] user_show_services lookup error:", ussErr.message);
      pickedServiceId = uss?.service_id ?? null;
    }

    if (!pickedServiceId) {
      const { data: ss, error: ssErr } = await supabase
        .from("show_services")
        .select("service_id")
        .eq("show_id", ep.show_id)
        .maybeSingle();

      if (ssErr) console.log("[notif] show_services lookup error:", ssErr.message);
      pickedServiceId = ss?.service_id ?? null;
    }
  }

  const { data: sh, error: shErr } = await supabase
    .from("shows")
    .select("id, title, poster_url")
    .eq("id", ep.show_id)
    .maybeSingle();

  if (shErr) console.log("[notif] shows lookup error:", shErr.message);

  let svc: any = null;
  if (pickedServiceId) {
    const { data, error: svcErr } = await supabase
      .from("streaming_services")
      .select("id, name, web_url, ios_deep_link, android_deep_link, roku_deep_link")
      .eq("id", pickedServiceId)
      .maybeSingle();

    if (svcErr) console.log("[notif] streaming_services lookup error:", svcErr.message);
    svc = data;
  }

  return {
    row: {
      episode_id: ep.id,
      show_id: ep.show_id,
      show_title: sh?.title ?? "Show",
      episode_title: ep.title ?? "Episode",
      service_id: svc?.id ?? null,
      service_name: svc?.name ?? null,
      web_url: svc?.web_url ?? null,
      ios_deep_link: svc?.ios_deep_link ?? null,
      android_deep_link: svc?.android_deep_link ?? null,
      roku_deep_link: svc?.roku_deep_link ?? null,
    },
    source: "base_join" as const,
  };
}

export async function handleNotificationOpen(
  data: Payload,
  opts?: { navigateToEpisode?: (episodeId: string) => void }
) {
  console.log("[notif] open payload:", data);

  const episodeId = data?.episode_id;
  if (!episodeId) return;

  const key = `${data.kind ?? "unknown"}:${episodeId}`;
  if (!shouldHandleOnce(key)) {
    console.log("[notif] duplicate open suppressed:", key);
    return;
  }

  // 1) navigate in-app (Tonight tab focuses/highlights)
  opts?.navigateToEpisode?.(episodeId);

  // 2) fetch details
  const found = await fetchEnrichedEpisode(episodeId, data.show_id, data.service_id);
  if (!found?.row) {
    console.log("[notif] no row found for episode:", episodeId);
    return;
  }

  console.log("[notif] row source:", found.source);

  const row: any = found.row;

  // 3) open service
  const opened = await openEpisodeLinks({
    service_name: row.service_name,
    web_url: row.web_url ?? row.service_web_url ?? null,
    android_deep_link: row.android_deep_link,
    ios_deep_link: row.ios_deep_link,
    roku_deep_link: row.roku_deep_link,
    show_title: row.show_title,
    episode_title: row.episode_title,
  } as any);

  if (!opened) {
    console.log("[notif] openEpisodeLinks returned false (no link available)");
  }
}

export function registerNotificationTapListeners(params: {
  navigateToEpisode?: (episodeId: string) => void;
}) {
  const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
    const data = (resp.notification.request.content.data || {}) as Payload;
    handleNotificationOpen(data, { navigateToEpisode: params.navigateToEpisode }).catch(() => {});
  });

  Notifications.getLastNotificationResponseAsync()
    .then((resp) => {
      if (!resp) return;
      const data = (resp.notification.request.content.data || {}) as Payload;
      return handleNotificationOpen(data, { navigateToEpisode: params.navigateToEpisode });
    })
    .catch(() => {});

  return () => sub.remove();
}
