// mobile/src/screens/WeekScreen.tsx
/**
 * WeekScreen
 * ==========
 * Upgrades:
 * - Uses SectionList with sticky day headers (better “calendar” feel)
 * - Keeps your Weekly Time Forecast block
 * - Keeps your day strip (All + Sun..Sat)
 * - Adds drop_ts_local to the select so UI/notifications can converge on one time source
 *
 * Notes:
 * - Still enriches runtime from episodes table (second pass)
 * - Does NOT require changes to EpisodeRow (it will ignore extra fields)
 */

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  SectionList,
  RefreshControl,
} from "react-native";
import * as Haptics from "expo-haptics";

import { supabase } from "../lib/supabase";
import { useRefreshBus } from "../context/RefreshBus";
import { logOpenService, logWatched } from "../lib/telemetry";
import { openEpisodeLinks } from "../lib/openEpisode";

import { Screen } from "../components/Screen";
import { AppHeader } from "../components/AppHeader";
import { Section } from "../components/Section";
import { EmptyState } from "../components/EmptyState";
import { Toast } from "../components/Toast";

import EpisodeRow from "../components/EpisodeRow";
import type { EpisodeRow as Row } from "../components/EpisodeCard";
import { THEME } from "../lib/theme";

/**
 * DEBUG switches (leave these here; they save hours).
 */
const DEBUG_LOG_WEEK_ROWS = true;
const DISABLE_WATCHED_FILTER = false;

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function dateKeyLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Normalize to YYYY-MM-DD */
function normalizeDateKeyMaybe(v: any): string {
  const s = String(v ?? "");
  if (!s) return s;
  if (s.length >= 10 && s[4] === "-" && s[7] === "-") return s.slice(0, 10);
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    d.setHours(0, 0, 0, 0);
    return dateKeyLocal(d);
  }
  return s;
}

function todayKeyLocal() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return dateKeyLocal(d);
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

function formatMinutes(totalMins: number) {
  const mins = Math.max(0, Math.floor(totalMins || 0));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h <= 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

type EnrichServiceRow = {
  id: string;
  name: string;
  logo_url: string | null;
  web_url: string | null;
  android_deep_link?: string | null;
  ios_deep_link?: string | null;
  show_url_template?: string | null;
  roku_deep_link?: string | null;
};

type RuntimeRow = { id: string; runtime: number | null };

type WeekSection = {
  key: string; // YYYY-MM-DD
  title: string;
  subtitle?: string;
  data: Row[];
};

export default function WeekScreen() {
  const { token, bump } = useRefreshBus();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [rows, setRows] = useState<Row[]>([]);
  const [errorText, setErrorText] = useState<string | null>(null);

  const [watchedLocal, setWatchedLocal] = useState<Set<string>>(new Set());
  const [busyEpisodeId, setBusyEpisodeId] = useState<string | null>(null);

  const [toastVisible, setToastVisible] = useState(false);
  const [lastWatched, setLastWatched] = useState<Row | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sunday-start week window (device local)
  const windowStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const day = d.getDay(); // 0=Sun..6=Sat
    d.setDate(d.getDate() - day);
    return d;
  }, []);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(windowStart, i)),
    [windowStart]
  );

  const weekStartISO = useMemo(() => dateKeyLocal(windowStart), [windowStart]);
  const weekEndISO = useMemo(() => dateKeyLocal(addDays(windowStart, 6)), [windowStart]);

  // day strip refs (for centering)
  const stripRef = useRef<ScrollView | null>(null);
  const didAutoCenterRef = useRef(false);

  const [selectedDayKey, setSelectedDayKey] = useState<string>(() => {
    const t = todayKeyLocal();
    const keys = new Set(days.map((d) => dateKeyLocal(d)));
    return keys.has(t) ? t : "ALL";
  });

  useEffect(() => {
    const t = todayKeyLocal();
    const keys = new Set(days.map((d) => dateKeyLocal(d)));
    if (selectedDayKey === "ALL") return;
    if (!keys.has(selectedDayKey)) setSelectedDayKey(keys.has(t) ? t : "ALL");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const softHaptic = useCallback(() => {
    if (Platform.OS === "web") return;
    try {
      Haptics.selectionAsync();
    } catch {}
  }, []);

  async function enrichRuntimes(base: Row[]): Promise<Row[]> {
    const ids = Array.from(new Set(base.map((r: any) => r.episode_id).filter(Boolean))) as string[];
    if (ids.length === 0) return base;

    const { data, error } = await supabase.from("episodes").select("id,runtime").in("id", ids);

    if (error) {
      console.log("[WeekScreen] runtime enrichment error:", error.message);
      return base;
    }

    const rtById = new Map<string, number | null>();
    for (const r of (data ?? []) as RuntimeRow[]) {
      rtById.set(r.id, r.runtime ?? null);
    }

    return base.map((r: any) => ({
      ...r,
      runtime: rtById.get(r.episode_id) ?? null,
    })) as Row[];
  }

  const load = useCallback(async () => {
    setErrorText(null);

    const { data: sessionData, error: sessErr } = await supabase.auth.getSession();
    if (sessErr) {
      setErrorText(sessErr.message);
      setRows([]);
      return;
    }

    const uid = sessionData.session?.user?.id;
    if (!uid) {
      setErrorText("Not signed in");
      setRows([]);
      return;
    }

    const VIEW = "v_week_episodes_all";

    // ✅ add drop_ts_local so UI can show “real” time when available
    const selectWithDate =
      "user_id, episode_id, show_id, show_title, episode_title, season, episode, air_date_local_date, air_date_local, drop_ts_local, service_id, service_name, service_web_url, poster_url, logo_url, show_url_template, provider_show_id, android_deep_link, ios_deep_link, android_intent_link, ios_app_store_url, android_play_store_url, roku_deep_link";

    const selectLegacy =
      "user_id, episode_id, show_id, show_title, episode_title, season, episode, air_date_local, service_id, service_name, service_web_url, poster_url, logo_url";

    let data: any[] = [];
    let usedLegacy = false;

    const res = await supabase
      .from(VIEW)
      .select(selectWithDate)
      .eq("user_id", uid)
      .gte("air_date_local_date", weekStartISO)
      .lte("air_date_local_date", weekEndISO)
      .order("air_date_local_date", { ascending: true })
      .order("show_title", { ascending: true })
      .order("season", { ascending: true })
      .order("episode", { ascending: true });

    if (res.error) {
      if (isColumnMissingError(res.error)) {
        usedLegacy = true;

        const retry = await supabase
          .from(VIEW)
          .select(selectLegacy)
          .eq("user_id", uid)
          .gte("air_date_local", weekStartISO)
          .lte("air_date_local", weekEndISO)
          .order("air_date_local", { ascending: true })
          .order("show_title", { ascending: true })
          .order("season", { ascending: true })
          .order("episode", { ascending: true });

        if (retry.error) {
          setErrorText(retry.error.message);
          setRows([]);
          return;
        }

        data = retry.data ?? [];
      } else {
        setErrorText(res.error.message);
        setRows([]);
        return;
      }
    } else {
      data = res.data ?? [];
    }

    const base: Row[] = (data ?? []).map((r: any) => {
      const airKey = normalizeDateKeyMaybe(r.air_date_local_date ?? r.air_date_local);
      const resolvedWeb = r.service_web_url ?? null;
      return { ...r, air_date_local: airKey, web_url: resolvedWeb } as Row;
    });

    const withRuntime = await enrichRuntimes(base);

    const serviceIds = Array.from(new Set(withRuntime.map((r: any) => r.service_id).filter(Boolean))) as string[];

    const servicesById = new Map<string, EnrichServiceRow>();
    if (serviceIds.length > 0) {
      const { data: svcData, error: svcErr } = await supabase
        .from("streaming_services")
        .select("id,name,logo_url,web_url,android_deep_link,ios_deep_link,show_url_template,roku_deep_link")
        .in("id", serviceIds);

      if (svcErr) {
        console.log("[WeekScreen] services enrichment error:", svcErr.message);
      } else {
        for (const s of (svcData ?? []) as EnrichServiceRow[]) servicesById.set(s.id, s);
      }
    }

    const enriched: Row[] = withRuntime.map((r: any) => {
      const svc = r.service_id ? servicesById.get(r.service_id) : undefined;
      const resolvedServiceWeb = r.service_web_url ?? svc?.web_url ?? null;

      return {
        ...r,
        poster_url: r.poster_url ?? null,
        logo_url: r.logo_url ?? svc?.logo_url ?? null,
        service_name: r.service_name ?? svc?.name ?? null,
        service_web_url: resolvedServiceWeb,
        web_url: resolvedServiceWeb,
        android_deep_link: r.android_deep_link ?? svc?.android_deep_link ?? null,
        ios_deep_link: r.ios_deep_link ?? svc?.ios_deep_link ?? null,
        show_url_template: r.show_url_template ?? svc?.show_url_template ?? null,
        roku_deep_link: r.roku_deep_link ?? svc?.roku_deep_link ?? null,
      } as Row;
    });

    if (DEBUG_LOG_WEEK_ROWS) {
      console.log("[WeekScreen] usingLegacy:", usedLegacy);
      console.log("[WeekScreen] week:", weekStartISO, "→", weekEndISO);
      console.log("[WeekScreen] rows:", enriched.length, enriched[0]);

      const bad = enriched.filter((r: any) => {
        const k = normalizeDateKeyMaybe(r.air_date_local);
        return k < weekStartISO || k > weekEndISO;
      });
      if (bad.length) console.log("[WeekScreen] BAD rows outside window:", bad.length, bad[0]);

      const missingRt = enriched.filter((r: any) => r.runtime == null).length;
      console.log("[WeekScreen] runtime missing count:", missingRt);
    }

    setRows(enriched);
  }, [weekStartISO, weekEndISO]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await load();
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  useEffect(() => {
    if (!toastVisible) return;
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastVisible(false), 4000);

    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    };
  }, [toastVisible]);

  const visibleRows = useMemo(() => {
    if (DISABLE_WATCHED_FILTER) return rows;
    return rows.filter((r: any) => !watchedLocal.has(r.episode_id));
  }, [rows, watchedLocal]);

  const grouped = useMemo(() => {
    const buckets: Record<string, Row[]> = {};
    for (const d of days) buckets[dateKeyLocal(d)] = [];
    for (const r of visibleRows) {
      const k = normalizeDateKeyMaybe((r as any).air_date_local);
      if (buckets[k]) buckets[k].push(r);
    }
    return buckets;
  }, [visibleRows, days]);

  const countsByDay = useMemo(() => {
    const out: Record<string, number> = {};
    for (const d of days) {
      const k = dateKeyLocal(d);
      out[k] = (grouped[k] ?? []).length;
    }
    return out;
  }, [days, grouped]);

  const visibleCount = useMemo(() => visibleRows.length, [visibleRows]);

  const timeForecast = useMemo(() => {
    const byService = new Map<string, { serviceName: string; minutes: number; logoUrl?: string | null }>();
    let total = 0;
    let missing = 0;

    for (const r of visibleRows as any[]) {
      const rt = r.runtime;
      if (rt == null || Number.isNaN(Number(rt))) {
        missing += 1;
        continue;
      }
      const mins = Math.max(0, Number(rt));
      total += mins;

      const sid = r.service_id ?? "unknown";
      const name = r.service_name ?? "Unknown";
      const logoUrl = r.logo_url ?? null;

      const cur = byService.get(sid) ?? { serviceName: name, minutes: 0, logoUrl };
      cur.minutes += mins;
      cur.serviceName = name;
      cur.logoUrl = logoUrl;
      byService.set(sid, cur);
    }

    const services = Array.from(byService.entries())
      .map(([serviceId, v]) => ({ serviceId, ...v }))
      .sort((a, b) => b.minutes - a.minutes);

    return { totalMinutes: total, missingRuntimeCount: missing, services };
  }, [visibleRows]);

  useEffect(() => {
    if (didAutoCenterRef.current) return;
    if (!stripRef.current) return;

    const t = todayKeyLocal();
    const idx = days.findIndex((d) => dateKeyLocal(d) === t);
    if (idx < 0) return;

    const approxCard = 78 + 10;
    const allCard = 78 + 10;
    const x = allCard + idx * approxCard - approxCard;
    didAutoCenterRef.current = true;

    setTimeout(() => {
      try {
        stripRef.current?.scrollTo({ x: Math.max(0, x), animated: true });
      } catch {}
    }, 50);
  }, [days]);

  async function handleOpen(r: Row) {
    try {
      setBusyEpisodeId((r as any).episode_id);

      await logOpenService({
        episodeId: (r as any).episode_id,
        serviceId: (r as any).service_id ?? null,
      });

      const opened = await openEpisodeLinks({
        ...(r as any),
        web_url: (r as any).web_url ?? (r as any).service_web_url ?? null,
        service_web_url: (r as any).service_web_url ?? null,
      });

      if (!opened) {
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
      setBusyEpisodeId((r as any).episode_id);

      setWatchedLocal((prev) => new Set(prev).add((r as any).episode_id));
      setLastWatched(r);
      setToastVisible(true);

      await logWatched({ episodeId: (r as any).episode_id });
      bump();
    } catch (e: any) {
      setWatchedLocal((prev) => {
        const next = new Set(prev);
        next.delete((r as any).episode_id);
        return next;
      });
      Alert.alert("Couldn’t mark watched", e?.message ?? "Unknown error");
    } finally {
      setBusyEpisodeId(null);
    }
  }

  const todayKey = todayKeyLocal();
  const selectedIsAll = selectedDayKey === "ALL";

  const onSelectDay = (key: string) => {
    if (key === selectedDayKey) return;
    setSelectedDayKey(key);
    softHaptic();
  };

  const chipBase = {
    borderWidth: 1,
    borderRadius: THEME.r.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center" as const,
    minWidth: 78,
  };

  const header = useMemo(() => {
    return (
      <View style={{ paddingHorizontal: THEME.pagePad ?? 18, paddingTop: 14, paddingBottom: 6 }}>
        <Section>
          {/* WEEKLY TIME FORECAST */}
          {visibleCount > 0 && (
            <View
              style={{
                borderWidth: 1,
                borderColor: THEME.borderSoft,
                backgroundColor: THEME.panel,
                borderRadius: THEME.r.lg,
                padding: 14,
                marginBottom: 12,
                ...THEME.shadow.card,
              }}
            >
              <Text style={{ fontWeight: "900", color: THEME.text, fontSize: 14 }}>This week’s time</Text>

              <Text style={{ fontWeight: "900", color: THEME.text, fontSize: 22, marginTop: 6 }}>
                {formatMinutes(timeForecast.totalMinutes)}
              </Text>

              {timeForecast.missingRuntimeCount > 0 && (
                <Text style={{ color: THEME.textMuted, marginTop: 4, fontSize: 12 }}>
                  Runtime missing for {timeForecast.missingRuntimeCount} episode
                  {timeForecast.missingRuntimeCount === 1 ? "" : "s"}.
                </Text>
              )}

              {timeForecast.services.length > 0 && (
                <View style={{ marginTop: 10, gap: 6 }}>
                  {timeForecast.services.slice(0, 5).map((s) => (
                    <View key={s.serviceId} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ color: THEME.textMuted, fontWeight: "800" }}>{s.serviceName}</Text>
                      <Text style={{ color: THEME.text, fontWeight: "900" }}>{formatMinutes(s.minutes)}</Text>
                    </View>
                  ))}

                  {timeForecast.services.length > 5 && (
                    <Text style={{ color: THEME.textMuted, marginTop: 2, fontSize: 12 }}>
                      +{timeForecast.services.length - 5} more services
                    </Text>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Day strip */}
          <ScrollView
            ref={(r) => {
              stripRef.current = r;
            }}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingVertical: 4 }}
          >
            <Pressable
              onPress={() => onSelectDay("ALL")}
              style={[
                chipBase,
                {
                  borderColor: selectedIsAll ? THEME.accentSoft : THEME.borderSoft,
                  backgroundColor: selectedIsAll ? THEME.accentSoft : "transparent",
                },
              ]}
            >
              <Text style={{ fontWeight: "900", color: THEME.text }}>All</Text>
              <Text style={{ marginTop: 2, color: THEME.textMuted, fontSize: 12 }}>{visibleCount}</Text>
            </Pressable>

            {days.map((d) => {
              const key = dateKeyLocal(d);
              const isSelected = key === selectedDayKey;
              const isToday = key === todayKey;
              const count = countsByDay[key] ?? 0;

              const weekday = d.toLocaleDateString(undefined, { weekday: "short" });
              const dayNum = d.getDate();

              const borderColor = isSelected ? THEME.accent : isToday ? THEME.accentSoft : THEME.borderSoft;
              const bg = isSelected ? THEME.accentSoft : "transparent";

              return (
                <Pressable
                  key={key}
                  onPress={() => onSelectDay(key)}
                  style={[
                    chipBase,
                    { borderColor, backgroundColor: bg, opacity: isSelected ? 1 : 0.94 },
                  ]}
                >
                  <Text style={{ fontWeight: "900", fontSize: 12, color: THEME.textMuted }}>
                    {weekday}
                    {isToday ? " •" : ""}
                  </Text>
                  <Text style={{ fontWeight: "900", fontSize: 16, marginTop: 2, color: THEME.text }}>{dayNum}</Text>
                  <Text style={{ fontWeight: "900", fontSize: 12, color: THEME.textMuted, marginTop: 4 }}>{count}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Section>
      </View>
    );
  }, [visibleCount, timeForecast, days, countsByDay, selectedDayKey, selectedIsAll, todayKey]);

  const sections: WeekSection[] = useMemo(() => {
    const buildTitle = (d: Date) =>
      d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

    if (visibleCount === 0) return [];

    if (selectedDayKey !== "ALL") {
      const d = days.find((x) => dateKeyLocal(x) === selectedDayKey);
      const title = d ? buildTitle(d) : selectedDayKey;
      const items = grouped[selectedDayKey] ?? [];
      return [{ key: selectedDayKey, title, subtitle: items.length ? undefined : "No releases", data: items }];
    }

    return days.map((d) => {
      const key = dateKeyLocal(d);
      const items = grouped[key] ?? [];
      return {
        key,
        title: buildTitle(d),
        subtitle: items.length ? undefined : "No releases",
        data: items,
      };
    });
  }, [selectedDayKey, grouped, days, visibleCount]);

  if (loading) {
    return (
      <Screen padded={false}>
        <View style={{ flex: 1, backgroundColor: THEME.bgSolid }}>
          <AppHeader title="This Week" subtitle="Your weekly release calendar" rightLabel="Refresh" onRightPress={onRefresh} />
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator />
          </View>
        </View>
      </Screen>
    );
  }

  if (errorText) {
    return (
      <Screen padded={false}>
        <View style={{ flex: 1, backgroundColor: THEME.bgSolid }}>
          <AppHeader title="This Week" subtitle="Your weekly release calendar" rightLabel="Retry" onRightPress={onRefresh} />
          <View style={{ paddingHorizontal: THEME.pagePad ?? 18, paddingTop: 16 }}>
            <Section title="Something broke">
              <Text style={{ color: THEME.danger, fontWeight: "900" }}>Error: {errorText}</Text>
            </Section>
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <>
      <Screen padded={false}>
        <View style={{ flex: 1, backgroundColor: THEME.bgSolid }}>
          <AppHeader title="This Week" subtitle={`${weekStartISO} → ${weekEndISO}`} rightLabel="Refresh" onRightPress={onRefresh} />

          {visibleCount === 0 ? (
            <View style={{ paddingHorizontal: THEME.pagePad ?? 18, paddingTop: 14 }}>
              <EmptyState title="You’re all caught up this week 🎉" subtitle="No new episodes between Sunday and Saturday." />
            </View>
          ) : (
            <SectionList
              sections={sections}
              keyExtractor={(item) => (item as any).episode_id}
              stickySectionHeadersEnabled
              ListHeaderComponent={header}
              contentContainerStyle={{ paddingBottom: 28 }}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.textDim} />
              }
              renderSectionHeader={({ section }) => (
                <View
                  style={{
                    paddingHorizontal: THEME.pagePad ?? 18,
                    paddingTop: 14,
                    paddingBottom: 8,
                    backgroundColor: THEME.bgSolid, // ensures sticky header looks clean
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "baseline",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text style={{ color: THEME.text, fontWeight: "900", fontSize: 14 }}>{section.title}</Text>
                    <Text style={{ color: THEME.textMuted, fontWeight: "900", fontSize: 12 }}>
                      {section.data.length}
                    </Text>
                  </View>
                  {!!section.subtitle && (
                    <Text style={{ color: THEME.textMuted, marginTop: 2, fontSize: 12 }}>{section.subtitle}</Text>
                  )}
                </View>
              )}
              renderItem={({ item }) => (
                <View style={{ paddingHorizontal: THEME.pagePad ?? 18, paddingBottom: 10 }}>
                  <EpisodeRow
                    row={item}
                    busy={busyEpisodeId === (item as any).episode_id}
                    onOpen={handleOpen}
                    onWatched={handleWatched}
                  />
                </View>
              )}
              ListEmptyComponent={
                <View style={{ paddingHorizontal: THEME.pagePad ?? 18, paddingTop: 14 }}>
                  <EmptyState title="No releases" subtitle="Pick another day or tap All." />
                </View>
              }
            />
          )}
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
            next.delete((lastWatched as any).episode_id);
            return next;
          });
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
