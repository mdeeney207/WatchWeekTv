import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Pressable,
  Alert,
  FlatList,
  RefreshControl,
} from "react-native";
import { supabase } from "../lib/supabase";
import { logOpenService, logWatched } from "../lib/telemetry";
import { openEpisodeLinks } from "../lib/openEpisode";
import EpisodeRow from "../components/EpisodeRow";
import { EmptyState } from "../components/EmptyState";
import { Toast } from "../components/Toast";
import type { EpisodeRow as Row } from "../components/EpisodeCard";
import { tmdbPosterUrl } from "../lib/tmdb";

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

type EnrichShowRow = { id: string; poster_url: string | null };


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

export default function TonightScreen() {
  const today = useMemo(() => todayLocalYMD(), []);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [watchedLocal, setWatchedLocal] = useState<Set<string>>(new Set());
  const [busyEpisodeId, setBusyEpisodeId] = useState<string | null>(null);

  const [toastVisible, setToastVisible] = useState(false);
  const [lastWatched, setLastWatched] = useState<Row | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectWithTitle =
    "user_id, episode_id, show_id, show_title, episode_title, season, episode, air_date_local, service_id, service_name, service_web_url";
  const selectLegacy =
    "user_id, episode_id, show_id, show_title, season, episode, air_date_local, service_id, service_name, service_web_url";

  const load = useCallback(async () => {
    setErrorText(null);

    const { data: sessionData, error: sessErr } =
      await supabase.auth.getSession();
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

    let data: any[] | null = null;

    const res = await supabase
      .from("v_tonight_episodes")
      .select(selectWithTitle)
      .eq("user_id", uid)
      .order("air_date_local", { ascending: true })
      .order("show_title", { ascending: true })
      .order("season", { ascending: true })
      .order("episode", { ascending: true });

    if (res.error) {
      if (isColumnMissingError(res.error)) {
        const retry = await supabase
          .from("v_tonight_episodes")
          .select(selectLegacy)
          .eq("user_id", uid)
          .order("air_date_local", { ascending: true })
          .order("show_title", { ascending: true })
          .order("season", { ascending: true })
          .order("episode", { ascending: true });

        if (retry.error) {
          const fallback = await supabase
            .from("v_tonight_episodes_base")
            .select(selectLegacy)
            .eq("user_id", uid)
            .order("air_date_local", { ascending: true })
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
    })) as Row[];

    const tonight = normalized.filter(
      (r) => r.air_date_local === today
    );

    // ---------- enrichment ----------
    const showIds = Array.from(
      new Set(tonight.map((r) => r.show_id).filter(Boolean))
    );
    const serviceIds = Array.from(
      new Set(tonight.map((r) => r.service_id).filter(Boolean))
    );

    const postersByShowId = new Map<
      string,
      { poster_url: string | null; poster_path: string | null }
    >();

    if (showIds.length > 0) {
      const { data: showData } = await supabase
        .from("shows")
        .select("id,poster_url")
        .in("id", showIds);


      for (const s of (showData ?? []) as EnrichShowRow[]) {
        postersByShowId.set(s.id, {
          poster_url: s.poster_url ?? null,
          poster_path: s.poster_path ?? null,
        });
      }
    }

    const servicesById = new Map<string, EnrichServiceRow>();

    if (serviceIds.length > 0) {
      const { data: svcData } = await supabase
        .from("streaming_services")
        .select(
          "id,name,logo_url,web_url,android_deep_link,ios_deep_link,show_url_template,roku_deep_link"
        )
        .in("id", serviceIds);

      for (const s of (svcData ?? []) as EnrichServiceRow[]) {
        servicesById.set(s.id, s);
      }
    }

    const enriched = tonight.map((r) => {
      const poster = postersByShowId.get(r.show_id!);
      const svc = r.service_id
        ? servicesById.get(r.service_id)
        : undefined;

      const posterUrl =
      poster?.poster_url ??
      (r as any).poster_url ??
      null;


      const resolvedServiceWeb =
        r.service_web_url ?? r.web_url ?? svc?.web_url ?? null;

      return {
        ...r,
        poster_url: posterUrl,
        logo_url: svc?.logo_url ?? r.logo_url ?? null,
        service_name: r.service_name ?? svc?.name ?? null,
        service_web_url: resolvedServiceWeb,
        web_url: resolvedServiceWeb,

        android_deep_link:
          svc?.android_deep_link ?? r.android_deep_link ?? null,
        ios_deep_link:
          svc?.ios_deep_link ?? r.ios_deep_link ?? null,
        show_url_template:
          svc?.show_url_template ?? r.show_url_template ?? null,
        roku_deep_link:
          svc?.roku_deep_link ?? r.roku_deep_link ?? null,
      } as Row;
    });

    setRows(enriched);
  }, [today]);

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
      if (toastTimerRef.current)
        clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    };
  }, [toastVisible]);

  async function handleOpen(r: Row) {
    try {
      setBusyEpisodeId(r.episode_id);

      await logOpenService({
        episodeId: r.episode_id,
        serviceId: r.service_id ?? null,
      });

      const opened = await openEpisodeLinks({
        ...(r as any),
        web_url: r.web_url ?? null,
        service_web_url: r.service_web_url ?? null,
      });

      if (!opened)
        Alert.alert(
          "No link available",
          "This episode doesn't have a supported link yet."
        );
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
    } catch (e: any) {
      setWatchedLocal((prev) => {
        const next = new Set(prev);
        next.delete(r.episode_id);
        return next;
      });
      Alert.alert(
        "Couldn’t mark watched",
        e?.message ?? "Unknown error"
      );
    } finally {
      setBusyEpisodeId(null);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (errorText) {
    return (
      <View style={{ flex: 1, padding: 18, gap: 12 }}>
        <Text style={{ color: "#b00020" }}>
          Error: {errorText}
        </Text>
        <Pressable
          onPress={load}
          style={{
            padding: 14,
            borderRadius: 12,
            borderWidth: 1,
            alignItems: "center",
          }}
        >
          <Text style={{ fontWeight: "900" }}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const visible = rows.filter(
    (r) => !watchedLocal.has(r.episode_id)
  );

  return (
    <View style={{ flex: 1, paddingHorizontal: 18, paddingTop: 8 }}>
      <FlatList
        data={visible}
        keyExtractor={(r) => r.episode_id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
        ListEmptyComponent={
          <EmptyState
            title="No releases tonight"
            subtitle="Check This Week for upcoming drops."
          />
        }
        renderItem={({ item }) => (
          <EpisodeRow
            row={item}
            busy={busyEpisodeId === item.episode_id}
            onOpen={handleOpen}
            onWatched={handleWatched}
          />
        )}
      />

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
          setToastVisible(false);
          setLastWatched(null);
        }}
        onHide={() => {
          setToastVisible(false);
          setLastWatched(null);
        }}
      />
    </View>
  );
}
