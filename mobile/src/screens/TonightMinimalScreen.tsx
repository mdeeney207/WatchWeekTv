// mobile/src/screens/TonightMinimalScreen.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";

import { supabase } from "../lib/supabase";
import { logOpenService, logWatched } from "../lib/telemetry";
import { openEpisodeLinks } from "../lib/openEpisode";
import EpisodeRow from "../components/EpisodeRow";
import { EmptyState } from "../components/EmptyState";
import { Toast } from "../components/Toast";
import type { EpisodeRow as Row } from "../components/EpisodeCard";

import {
  scheduleTonightRows,
  cancelEpisodeReminder,
  scheduleEpisodeReminder,
  STORAGE_REMINDERS_ENABLED,
} from "../lib/notifications";

// DB-last follow store (local)
import { localMyShowsRepo as myShowsRepo } from "../lib/myShowsRepo";

import { Screen } from "../components/Screen";
import { AppHeader } from "../components/AppHeader";
import { GlassCard } from "../components/GlassCard";
import { Button } from "../components/Button";
import { THEME } from "../lib/theme";

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}
function todayLocalYMD(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function toLocalYMD(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
}
function isColumnMissingError(e: any) {
  const msg = String(e?.message ?? "").toLowerCase();
  return (
    (msg.includes("could not find the") && msg.includes("column")) ||
    msg.includes("does not exist") ||
    msg.includes("unknown field") ||
    msg.includes("schema cache")
  );
}

type TonightRouteParams = {
  focusEpisodeId?: string;
};

function scheduleKeyForDay(uid: string, ymd: string) {
  return `notif:tonight:${uid}:${ymd}`;
}

// ✅ include runtime (now available in view)
const SELECT_WITH_TITLE = [
  "user_id",
  "episode_id",
  "show_id",
  "show_title",
  "episode_title",
  "season",
  "episode",
  "air_date_local",
  "air_date_utc",
  "air_date_local_date",
  "drop_ts_local",
  "service_id",
  "service_name",
  "service_web_url",
  "show_url_template",
  "ios_deep_link",
  "android_deep_link",
  "android_intent_link",
  "ios_app_store_url",
  "android_play_store_url",
  "roku_deep_link",
  "poster_url",
  "logo_url",
  "provider_show_id",
  "runtime",
].join(",");

// legacy fallback (older schemas)
const SELECT_LEGACY = [
  "user_id",
  "episode_id",
  "show_id",
  "show_title",
  "season",
  "episode",
  "air_date_local",
  "air_date_utc",
  "air_date_local_date",
  "service_id",
  "service_name",
  "service_web_url",
  "poster_url",
  "logo_url",
].join(",");

export default function TonightMinimalScreen() {
  const today = useMemo(() => todayLocalYMD(), []);
  const isEmulator = Device.isDevice === false;

  const route = useRoute<any>();
  const focusEpisodeId: string | undefined = (
    route?.params as TonightRouteParams | undefined
  )?.focusEpisodeId;

  const listRef = useRef<FlatList<Row> | null>(null);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [watchedLocal, setWatchedLocal] = useState<Set<string>>(new Set());
  const [busyEpisodeId, setBusyEpisodeId] = useState<string | null>(null);

  const [toastVisible, setToastVisible] = useState(false);
  const [lastWatched, setLastWatched] = useState<Row | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [focusedId, setFocusedId] = useState<string | null>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
  const [followingLoaded, setFollowingLoaded] = useState(false);

  const [uid, setUid] = useState<string | null>(null);

  // reminders toggle
  const [remindersEnabled, setRemindersEnabled] = useState(true); // default ON
  const [remindersLoaded, setRemindersLoaded] = useState(false);
  const [enablingReminders, setEnablingReminders] = useState(false);

  const loadFollowing = useCallback(async () => {
    try {
      const list = await myShowsRepo.load();
      const set = new Set<string>();
      for (const r of list as any[]) if (r?.show_id) set.add(String(r.show_id));
      setFollowingSet(set);
    } catch {
      setFollowingSet(new Set());
    } finally {
      setFollowingLoaded(true);
    }
  }, []);

  // read reminders toggle once
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_REMINDERS_ENABLED);
        const enabled = raw == null ? true : raw !== "0";

        if (!alive) return;
        setRemindersEnabled(enabled);

        console.log("[Tonight] reminders raw:", raw);
        console.log("[Tonight] reminders enabled computed:", enabled);
        console.log("[Tonight] isDevice:", Device.isDevice, "isEmulator:", isEmulator);
      } catch (e: any) {
        console.log("[Tonight] reminders read error:", e?.message ?? e);
        if (!alive) return;
        setRemindersEnabled(true);
      } finally {
        if (alive) setRemindersLoaded(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, [isEmulator]);

  const load = useCallback(async () => {
    setErrorText(null);

    const { data: sessionData, error: sessErr } = await supabase.auth.getSession();
    if (sessErr) {
      setErrorText(sessErr.message);
      setRows([]);
      setUid(null);
      return;
    }

    const nextUid = sessionData.session?.user?.id ?? null;
    setUid(nextUid);

    if (!nextUid) {
      setRows([]);
      setErrorText(null);
      return;
    }

    let data: any[] | null = null;

    const res = await supabase
      .from("v_tonight_episodes")
      .select(SELECT_WITH_TITLE)
      .eq("user_id", nextUid)
      .order("air_date_local_date", { ascending: true })
      .order("show_title", { ascending: true })
      .order("season", { ascending: true })
      .order("episode", { ascending: true });

    if (res.error) {
      if (isColumnMissingError(res.error)) {
        const retry = await supabase
          .from("v_tonight_episodes")
          .select(SELECT_LEGACY)
          .eq("user_id", nextUid)
          .order("air_date_local_date", { ascending: true })
          .order("show_title", { ascending: true })
          .order("season", { ascending: true })
          .order("episode", { ascending: true });

        if (retry.error) {
          const fallback = await supabase
            .from("v_tonight_episodes_base")
            .select(SELECT_LEGACY)
            .eq("user_id", nextUid)
            .order("air_date_local_date", { ascending: true })
            .order("show_title", { ascending: true })
            .order("season", { ascending: true })
            .order("episode", { ascending: true });

          if (fallback.error) {
            setErrorText(fallback.error.message);
            setRows([]);
            return;
          }
          data = fallback.data ?? [];
        } else {
          data = retry.data ?? [];
        }
      } else {
        setErrorText(res.error.message);
        setRows([]);
        return;
      }
    } else {
      data = res.data ?? [];
    }

    const normalized = (data ?? []).map((r: any) => ({
      ...r,
      air_date_local: toLocalYMD(r.air_date_local),
      web_url: r.web_url ?? r.service_web_url ?? null,
      runtime: r.runtime ?? null,
    })) as any as Row[];

    const tonight = normalized.filter((r) => (r as any).air_date_local === today);
    setRows(tonight);

    // load following after we have rows; scheduler waits for followingLoaded anyway
    setFollowingLoaded(false);
    await loadFollowing();
  }, [today, loadFollowing]);

  const visible = useMemo(
    () => rows.filter((r) => !watchedLocal.has(r.episode_id)),
    [rows, watchedLocal]
  );

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await load();
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  /**
   * Schedule gate: ONLY once per day per user.
   * ✅ Schedule ONLY followed shows.
   */
  useEffect(() => {
    if (!uid) return;
    if (!rows?.length) return;
    if (!remindersLoaded) return;
    if (!followingLoaded) return;

    // schedule only followed shows
    const rowsToSchedule = rows.filter((r: any) => followingSet.has(String(r.show_id)));
    if (!rowsToSchedule.length) {
      console.log("[Tonight] scheduleTonightRows: no followed shows tonight");
      return;
    }

    let cancelled = false;

    (async () => {
      let raw: string | null = null;
      let enabledNow = true;

      try {
        raw = await AsyncStorage.getItem(STORAGE_REMINDERS_ENABLED);
        enabledNow = raw == null ? true : raw !== "0";
      } catch (e: any) {
        console.log("[Tonight] reminders read error (gate):", e?.message ?? e);
        raw = null;
        enabledNow = true;
      }

      console.log("[Tonight] reminders raw:", raw);
      console.log("[Tonight] reminders enabled computed:", enabledNow);

      if (!enabledNow) {
        console.log("[Tonight] scheduleTonightRows: blocked (reminders disabled)");
        return;
      }

      const key = scheduleKeyForDay(uid, today);

      const already = await AsyncStorage.getItem(key);
      if (already) {
        console.log("[Tonight] scheduleTonightRows: blocked (daily gate already set)", key);
        return;
      }

      try {
        const results = await scheduleTonightRows(
          rowsToSchedule.map((r: any) => ({
            episode_id: r.episode_id,
            show_id: r.show_id,
            service_id: r.service_id ?? null,
            show_title: r.show_title,
            episode_title: r.episode_title ?? null,
            service_name: r.service_name ?? null,
            air_date_local: r.air_date_local ?? null,
            air_date_local_date: r.air_date_local_date,
            drop_ts_local: r.drop_ts_local ?? null,
            season: r.season ?? null,
            episode: r.episode ?? null,
          }))
        );

        if (cancelled) return;

        const anyScheduled = results.some((x: any) => x?.scheduled === true);
        if (anyScheduled) {
          await AsyncStorage.setItem(key, "1");
          console.log("[Tonight] scheduleTonightRows: daily gate set", key);
        } else {
          console.log("[Tonight] scheduleTonightRows: daily gate NOT set (no schedules)");
        }
      } catch (e: any) {
        if (!cancelled) console.log("[Tonight] schedule error:", e?.message ?? e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [rows, uid, today, remindersLoaded, followingLoaded, followingSet]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (uid) await AsyncStorage.removeItem(scheduleKeyForDay(uid, today));

      // DEBUG ONLY: clear episode dedupe keys so you can reschedule on emulator
      for (const r of rows) {
        await AsyncStorage.removeItem(`notif:episode:${r.episode_id}`);
      }

      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load, uid, today, rows]);

  useEffect(() => {
    if (!toastVisible) return;
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastVisible(false), 4000);
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    };
  }, [toastVisible]);

  useEffect(() => {
    if (!focusEpisodeId) return;
    if (focusTimerRef.current) clearTimeout(focusTimerRef.current);

    setFocusedId(focusEpisodeId);
    focusTimerRef.current = setTimeout(() => {
      setFocusedId(null);
      focusTimerRef.current = null;
    }, 4000);

    return () => {
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
      focusTimerRef.current = null;
    };
  }, [focusEpisodeId]);

  useEffect(() => {
    if (!focusEpisodeId) return;
    if (!visible.length) return;

    const idx = visible.findIndex((r) => r.episode_id === focusEpisodeId);
    if (idx < 0) return;

    const t = setTimeout(() => {
      try {
        listRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.25 });
      } catch {}
    }, 150);

    return () => clearTimeout(t);
  }, [focusEpisodeId, visible]);

  async function handleOpen(r: Row) {
    try {
      setBusyEpisodeId(r.episode_id);

      await logOpenService({
        episodeId: r.episode_id,
        serviceId: (r as any).service_id ?? null,
      });

      const outcome = await openEpisodeLinks({
        ...(r as any),
        service_web_url: (r as any).service_web_url ?? null,
        web_url: (r as any).web_url ?? (r as any).service_web_url ?? null,
        roku_deep_link: (r as any).roku_deep_link ?? null,
        android_intent_link: (r as any).android_intent_link ?? null,
        android_deep_link: (r as any).android_deep_link ?? null,
        ios_deep_link: (r as any).ios_deep_link ?? null,
      });

      if (!outcome?.ok) {
        Alert.alert("No link available", "This episode doesn't have a supported link yet.");
      }
    } catch (e: any) {
      Alert.alert("Open failed", e?.message ?? "Unknown error");
    } finally {
      setBusyEpisodeId(null);
    }
  }

  async function handleWatched(r: Row) {
    try {
      setBusyEpisodeId(r.episode_id);

      setWatchedLocal((prev) => new Set(prev).add(r.episode_id));
      setLastWatched(r);
      setToastVisible(true);

      await logWatched({ episodeId: r.episode_id });
      await cancelEpisodeReminder(r.episode_id);
    } catch (e: any) {
      setWatchedLocal((prev) => {
        const next = new Set(prev);
        next.delete(r.episode_id);
        return next;
      });
      Alert.alert("Couldn’t mark watched", e?.message ?? "Unknown error");
    } finally {
      setBusyEpisodeId(null);
    }
  }

  const enableReminders = useCallback(async () => {
    setEnablingReminders(true);
    try {
      await AsyncStorage.setItem(STORAGE_REMINDERS_ENABLED, "1");
      const verify = await AsyncStorage.getItem(STORAGE_REMINDERS_ENABLED);

      setRemindersEnabled(true);

      console.log("[Tonight] reminders set:", "1");
      console.log("[Tonight] reminders verify:", verify);

      if (uid) await AsyncStorage.removeItem(scheduleKeyForDay(uid, today));

      // DEBUG ONLY: also clear episode dedupe keys for immediate re-test
      for (const r of rows) {
        await AsyncStorage.removeItem(`notif:episode:${r.episode_id}`);
      }
    } catch (e: any) {
      Alert.alert("Couldn’t enable reminders", e?.message ?? "Unknown error");
    } finally {
      setEnablingReminders(false);
    }
  }, [uid, today, rows]);

  if (loading) {
    return (
      <Screen padded={false}>
        <View style={{ flex: 1, backgroundColor: THEME.bgSolid }}>
          <AppHeader
            title="Tonight"
            subtitle="Low-noise list of what drops today"
            rightLabel="Refresh"
            onRightPress={onRefresh}
          />
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator />
          </View>
        </View>
      </Screen>
    );
  }

  if (!uid) {
    return (
      <Screen padded={false}>
        <View style={{ flex: 1, backgroundColor: THEME.bgSolid }}>
          <AppHeader title="Tonight" subtitle="Sign in required" />
          <View style={{ paddingHorizontal: THEME.pagePad ?? 18, paddingTop: 14 }}>
            <GlassCard>
              <EmptyState
                title="Please sign in"
                subtitle="Sign in to see tonight’s releases and enable reminders."
              />
            </GlassCard>
          </View>
        </View>
      </Screen>
    );
  }

  if (errorText) {
    return (
      <Screen padded={false}>
        <View style={{ flex: 1, backgroundColor: THEME.bgSolid }}>
          <AppHeader
            title="Tonight"
            subtitle="Couldn’t load episodes"
            rightLabel="Retry"
            onRightPress={onRefresh}
          />
          <View style={{ paddingHorizontal: THEME.pagePad ?? 18, paddingTop: 14 }}>
            <GlassCard>
              <Text style={{ color: THEME.danger, fontWeight: "900" }}>
                Error: {errorText}
              </Text>
              <View style={{ marginTop: 12 }}>
                <Button label="Retry" variant="secondary" onPress={onRefresh} />
              </View>
            </GlassCard>
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <>
      <Screen padded={false}>
        <View style={{ flex: 1, backgroundColor: THEME.bgSolid }}>
          <AppHeader
            title="Tonight"
            subtitle="Low-noise list of what drops today"
            rightLabel="Refresh"
            onRightPress={onRefresh}
          />

          <FlatList
            ref={(r) => (listRef.current = r)}
            data={visible}
            keyExtractor={(r) => r.episode_id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={THEME.textDim}
              />
            }
            contentContainerStyle={{
              paddingHorizontal: THEME.pagePad ?? 18,
              paddingTop: 14,
              paddingBottom: 28,
            }}
            ListHeaderComponent={
              <GlassCard style={{ marginBottom: 12 }}>
                {!remindersEnabled ? (
                  <>
                    <Text style={{ color: THEME.text, fontWeight: "900", fontSize: 14 }}>
                      Enable reminders
                    </Text>
                    <Text
                      style={{
                        color: THEME.textDim,
                        marginTop: 4,
                        fontSize: 12,
                        lineHeight: 16,
                      }}
                    >
                      Get a notification when your followed shows drop tonight.
                    </Text>

                    <View style={{ marginTop: 12 }}>
                      <Button
                        label={enablingReminders ? "Enabling..." : "Enable reminders"}
                        variant="primary"
                        size="lg"
                        onPress={enableReminders}
                        loading={enablingReminders}
                      />
                    </View>

                    {isEmulator && (
                      <Text style={{ color: THEME.textMuted, marginTop: 8, fontSize: 12 }}>
                        Emulator note: local notifications work; push behavior differs on real devices.
                      </Text>
                    )}
                  </>
                ) : (
                  <>
                    <Text style={{ color: THEME.text, fontWeight: "900", fontSize: 14 }}>
                      Reminders enabled
                    </Text>
                    <Text
                      style={{
                        color: THEME.textDim,
                        marginTop: 4,
                        fontSize: 12,
                        lineHeight: 16,
                      }}
                    >
                      We’ll notify you for tonight’s drops (once per day, no duplicates).
                    </Text>
                  </>
                )}
              </GlassCard>
            }
            ListEmptyComponent={
              <GlassCard>
                <EmptyState title="No releases tonight" subtitle="Check This Week for upcoming drops." />
              </GlassCard>
            }
            ItemSeparatorComponent={() => <View style={{ height: 10 } } />}
            onScrollToIndexFailed={() => {}}
            renderItem={({ item }) => {
              const isFocused = focusedId && item.episode_id === focusedId;
              const isFollowing = followingSet.has(String((item as any).show_id));

              return (
                <View
                  style={
                    isFocused
                      ? {
                          borderWidth: 1,
                          borderColor: THEME.accent,
                          backgroundColor: THEME.accentSoft,
                          borderRadius: THEME.r.md,
                          padding: 6,
                        }
                      : undefined
                  }
                >
                  <EpisodeRow
                    row={item}
                    busy={busyEpisodeId === item.episode_id}
                    onOpen={handleOpen}
                    onWatched={handleWatched}
                    isFollowing={isFollowing}
                  />
                </View>
              );
            }}
          />
        </View>
      </Screen>

      <Toast
        visible={toastVisible}
        message="Marked watched"
        actionLabel="Undo"
        onAction={() => {
          if (!lastWatched) return;

          setWatchedLocal((prev) => {
            const next = new Set(prev);
            next.delete(lastWatched.episode_id);
            return next;
          });

          // Only reschedule if reminders enabled.
          if (remindersEnabled) {
            scheduleEpisodeReminder({
              episodeId: lastWatched.episode_id,
              showId: (lastWatched as any).show_id,
              serviceId: (lastWatched as any).service_id ?? null,
              showTitle: lastWatched.show_title,
              episodeTitle: lastWatched.episode_title ?? null,
              serviceName: (lastWatched as any).service_name ?? null,
              season: (lastWatched as any).season ?? null,
              episode: (lastWatched as any).episode ?? null,
              airDateLocalText: (lastWatched as any).air_date_local ?? null,
              airDateLocalDate: (lastWatched as any).air_date_local_date,
              dropTsLocal: (lastWatched as any).drop_ts_local ?? null,
            }).catch(() => {});
          }

          setToastVisible(false);
          setLastWatched(null);
        }}
        onHide={() => {
          setToastVisible(false);
          setLastWatched(null);
        }}
      />
    </>
  );
}
