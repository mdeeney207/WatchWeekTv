// mobile/src/lib/notifications.ts
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Show notifications while app is in foreground (dev-friendly).
 * NOTE: shouldShowAlert is deprecated; use shouldShowBanner / shouldShowList.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const ANDROID_CHANNEL_ID = "watchweek";
const STORAGE_PREFIX = "notif:episode:";

// ✅ Master toggle key (single source of truth)
// Must match TonightMinimalScreen.tsx and SettingsScreen.tsx
export const STORAGE_REMINDERS_ENABLED = "watchweek:reminders_enabled";

// Flip to true ONLY when testing on emulator/time. Keep false for normal behavior.
const NOTIF_TEST_MODE = false;

type StoredNotif = {
  notificationId: string;
  scheduledForISO: string;
};

function keyForEpisode(episodeId: string) {
  return `${STORAGE_PREFIX}${episodeId}`;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/**
 * Master toggle from Settings.
 * Default: ON (true) unless explicitly set to "0".
 */
export async function areNotificationsEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_REMINDERS_ENABLED);
    if (raw == null) return true; // default ON
    return raw !== "0";
  } catch (e) {
    // If storage fails, fail OPEN (don’t break reminders unexpectedly)
    console.log(
      "[notif] settings read failed; defaulting enabled:",
      (e as any)?.message ?? e
    );
    return true;
  }
}

/**
 * Never return an empty episode label.
 * If episodeTitle is missing, fall back to SxxExx.
 */
function episodeLabel(params: {
  episodeTitle?: string | null;
  season?: number | null;
  episode?: number | null;
}) {
  const t = params.episodeTitle?.trim();
  if (t) return t;

  const s = params.season ?? null;
  const e = params.episode ?? null;

  if (typeof s === "number" && typeof e === "number") {
    return `S${pad2(s)}E${pad2(e)}`;
  }

  return "New episode";
}

/**
 * Returns true if permissions granted and (android) channel is set.
 * Allows emulator scheduling (local notifications) for dev testing.
 */
let _permCached: boolean | null = null;

export async function ensureNotificationPermissions(): Promise<boolean> {
  // Cache so we don't spam permission/channel calls per-episode
  if (_permCached !== null) return _permCached;

  if (!Device.isDevice) {
    console.log("[notif] emulator detected; allowing local notifications for dev");
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;

  if (status !== "granted") {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }

  if (status !== "granted") {
    _permCached = false;
    return false;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: "WatchWeek",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  _permCached = true;
  return true;
}

/**
 * Computes the local fire date:
 * - if air_date_local has HH:MM -> schedule at that time minus leadMinutes
 * - else schedule at default time (8:00 PM local by default) minus leadMinutes
 */
export function computeFireDateLocal(params: {
  airDateLocalText?: string | null; // e.g. "2026-02-10 21:00" OR "2026-02-10"
  airDateLocalDate: string; // "YYYY-MM-DD"
  leadMinutes?: number; // default 15
  defaultHour?: number; // default 20 (8pm)
  defaultMinute?: number; // default 0
}): Date {
  const {
    airDateLocalText,
    airDateLocalDate,
    leadMinutes = 15,
    defaultHour = 20,
    defaultMinute = 0,
  } = params;

  let hh: number | null = null;
  let mm: number | null = null;

  if (airDateLocalText) {
    const m = airDateLocalText.match(/(\d{1,2}):(\d{2})/);
    if (m) {
      hh = Number(m[1]);
      mm = Number(m[2]);
      if (Number.isNaN(hh)) hh = null;
      if (Number.isNaN(mm)) mm = null;
    }
  }

  const [Y, M, D] = airDateLocalDate.split("-").map((x) => Number(x));

  // Local device timezone
  const base = new Date(
    Y,
    (M ?? 1) - 1,
    D ?? 1,
    hh ?? defaultHour,
    mm ?? defaultMinute,
    0,
    0
  );

  // subtract lead time
  base.setMinutes(base.getMinutes() - leadMinutes);
  return base;
}

/**
 * Low-level scheduler (kept for utility use)
 *
 * IMPORTANT:
 * - Android will show "no show name" if content.title is missing/empty.
 * - Always pass a non-empty title.
 */
export async function scheduleReminder(
  title: string,
  body: string,
  when: Date,
  data?: Record<string, any>
) {
  const safeTitle = title?.trim() ? title.trim() : "WatchWeek";
  const safeBody = body?.trim() ? body.trim() : "";

  return Notifications.scheduleNotificationAsync({
    content: { title: safeTitle, body: safeBody, data: data ?? {} },
    trigger:
      Platform.OS === "android"
        ? ({ date: when, channelId: ANDROID_CHANNEL_ID } as any)
        : ({ date: when } as any),
  });
}

/**
 * Internal helper: schedule WITHOUT re-checking master toggle + permissions.
 * Callers MUST have already enforced those checks once.
 */
async function scheduleEpisodeReminderCore(params: {
  episodeId: string;
  showId?: string;
  serviceId?: string | null;

  showTitle: string;
  episodeTitle?: string | null;
  serviceName?: string | null;

  season?: number | null;
  episode?: number | null;

  airDateLocalText?: string | null;
  airDateLocalDate: string; // YYYY-MM-DD

  leadMinutes?: number;
  defaultHour?: number;
  defaultMinute?: number;
}): Promise<
  | { scheduled: true; notificationId: string; fireDate: Date }
  | { scheduled: false; reason: "duplicate" | "in-past"; fireDate?: Date }
> {
  const storageKey = keyForEpisode(params.episodeId);
  const isEmulator = !Device.isDevice;

  // Dedupe:
  const existing = await AsyncStorage.getItem(storageKey);
  if (existing) {
    // Emulator: trust storage (OS list is unreliable)
    if (isEmulator) {
      return { scheduled: false, reason: "duplicate" };
    }

    // Real device: self-heal if OS no longer has the notification
    try {
      const parsed = JSON.parse(existing) as { notificationId?: string };
      const all = await Notifications.getAllScheduledNotificationsAsync();
      const stillThere = parsed?.notificationId
        ? all.some((n) => n.identifier === parsed.notificationId)
        : false;

      if (stillThere) return { scheduled: false, reason: "duplicate" };

      console.log("[notif] stale dedupe detected; rescheduling", params.episodeId);
      await AsyncStorage.removeItem(storageKey);
    } catch {
      await AsyncStorage.removeItem(storageKey);
    }
  }

  // Compute intended fire date
  let fireDate = computeFireDateLocal({
    airDateLocalText: params.airDateLocalText,
    airDateLocalDate: params.airDateLocalDate,
    leadMinutes: params.leadMinutes ?? 15,
    defaultHour: params.defaultHour ?? 20,
    defaultMinute: params.defaultMinute ?? 0,
  });

  // TEST MODE: force fire in ~2 minutes (useful on emulator)
  if (NOTIF_TEST_MODE) {
    const test = new Date();
    test.setMinutes(test.getMinutes() + 2);
    test.setSeconds(0, 0);
    fireDate = test;
  }

  console.log("[notif] scheduling", params.episodeId, "at", fireDate.toString());

  // Don’t schedule if already in the past (or basically now)
  if (fireDate.getTime() <= Date.now() + 5_000) {
    return { scheduled: false, reason: "in-past", fireDate };
  }

  // ✅ ANDROID: put the SHOW NAME in content.title (not in body)
  const showTitle = params.showTitle?.trim() ? params.showTitle.trim() : "WatchWeek";

  const epText = episodeLabel({
    episodeTitle: params.episodeTitle ?? null,
    season: params.season ?? null,
    episode: params.episode ?? null,
  });

  const title = showTitle;

  // Body should be short + useful; never empty
  const body = [epText, params.serviceName?.trim() ? `• ${params.serviceName.trim()}` : null]
    .filter(Boolean)
    .join(" ");

  const notificationId = await scheduleReminder(title, body, fireDate, {
    kind: "episode_reminder",
    episode_id: params.episodeId,
    show_id: params.showId ?? null,
    service_id: params.serviceId ?? null,
  });

  const stored: StoredNotif = {
    notificationId,
    scheduledForISO: fireDate.toISOString(),
  };
  await AsyncStorage.setItem(storageKey, JSON.stringify(stored));

  return { scheduled: true, notificationId, fireDate };
}

/**
 * Episode-aware scheduler with dedupe + self-heal.
 * Returns status so caller can log/inspect.
 *
 * NEW:
 * - Respects Settings toggle. If disabled, returns { scheduled:false, reason:"disabled" }.
 */
export async function scheduleEpisodeReminder(params: {
  episodeId: string;
  showId?: string;
  serviceId?: string | null;

  showTitle: string;
  episodeTitle?: string | null;
  serviceName?: string | null;

  season?: number | null;
  episode?: number | null;

  airDateLocalText?: string | null;
  airDateLocalDate: string; // YYYY-MM-DD

  leadMinutes?: number;
  defaultHour?: number;
  defaultMinute?: number;
}): Promise<
  | { scheduled: true; notificationId: string; fireDate: Date }
  | { scheduled: false; reason: "disabled" | "no-permission" | "duplicate" | "in-past"; fireDate?: Date }
> {
  // ✅ master toggle
  const enabled = await areNotificationsEnabled();
  if (!enabled) return { scheduled: false, reason: "disabled" };

  const ok = await ensureNotificationPermissions();
  if (!ok) return { scheduled: false, reason: "no-permission" };

  const res = await scheduleEpisodeReminderCore(params);
  if (res.scheduled) return res;

  return { scheduled: false, reason: res.reason, fireDate: res.fireDate };
}

/**
 * Cancel an episode reminder (used by Watched).
 */
export async function cancelEpisodeReminder(episodeId: string): Promise<boolean> {
  const storageKey = keyForEpisode(episodeId);
  const existing = await AsyncStorage.getItem(storageKey);
  if (!existing) return false;

  try {
    const parsed = JSON.parse(existing) as StoredNotif;
    if (parsed?.notificationId) {
      await Notifications.cancelScheduledNotificationAsync(parsed.notificationId);
    }
  } catch {
    // ignore parse errors
  }

  await AsyncStorage.removeItem(storageKey);
  return true;
}

/**
 * Debug helper: list currently scheduled notifications.
 * NOTE: Some emulators return [] even after scheduling; real devices are reliable.
 */
export async function listScheduledNotifications() {
  const items = await Notifications.getAllScheduledNotificationsAsync();
  console.log(
    "[notif] scheduled:",
    items.map((n) => ({
      id: n.identifier,
      title: n.content?.title,
      body: n.content?.body,
      trigger: n.trigger,
    }))
  );
  return items;
}

/**
 * Bulk schedule for Tonight rows (your v_tonight_episodes shape).
 */
export async function scheduleTonightRows(
  rows: Array<{
    episode_id: string;
    show_id: string;
    service_id: string | null;
    show_title: string;
    episode_title?: string | null;
    service_name?: string | null;
    air_date_local?: string | null;
    air_date_local_date: string; // YYYY-MM-DD
    season?: number | null;
    episode?: number | null;
  }>
) {
  // Master toggle once
  const enabled = await areNotificationsEnabled();
  if (!enabled) {
    console.log("[notif] master toggle OFF; skipping scheduleTonightRows");
    return rows.map(() => ({ scheduled: false as const, reason: "disabled" as const }));
  }

  // Permissions once
  const ok = await ensureNotificationPermissions();
  if (!ok) {
    console.log("[notif] no permission; skipping scheduleTonightRows");
    return rows.map(() => ({ scheduled: false as const, reason: "no-permission" as const }));
  }

  const results = [];
  for (const r of rows) {
    // ✅ call core version to avoid re-checking perms/toggle every row
    results.push(
      await scheduleEpisodeReminderCore({
        episodeId: r.episode_id,
        showId: r.show_id,
        serviceId: r.service_id ?? null,

        showTitle: r.show_title,
        episodeTitle: r.episode_title ?? null,
        serviceName: r.service_name ?? null,

        season: (r as any).season ?? null,
        episode: (r as any).episode ?? null,

        airDateLocalText: r.air_date_local ?? null,
        airDateLocalDate: r.air_date_local_date,
      })
    );
  }

  return results;
}
