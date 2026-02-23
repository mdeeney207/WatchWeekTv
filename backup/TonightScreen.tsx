import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ActivityIndicator, ScrollView, Pressable, Alert } from "react-native";
import { supabase } from "../lib/supabase";
import { useRefreshBus } from "../context/RefreshBus";
import { logOpenService, logWatched } from "../lib/telemetry";
import { EmptyState } from "../components/EmptyState";
import { Toast } from "../components/Toast";
import { EpisodeCard, type EpisodeRow as Row } from "../components/EpisodeCard";

function todayKeyNY(): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());

    const y = parts.find((p) => p.type === "year")?.value ?? "0000";
    const m = parts.find((p) => p.type === "month")?.value ?? "00";
    const d = parts.find((p) => p.type === "day")?.value ?? "00";
    return `${y}-${m}-${d}`;
  } catch {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  }
}

export default function TonightScreen() {
  const { token } = useRefreshBus();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [errorText, setErrorText] = useState<string | null>(null);

  const [watchedLocal, setWatchedLocal] = useState<Set<string>>(new Set());
  const [busyEpisodeId, setBusyEpisodeId] = useState<string | null>(null);

  const [toastVisible, setToastVisible] = useState(false);
  const [lastWatched, setLastWatched] = useState<Row | null>(null);

  const todayKey = useMemo(() => todayKeyNY(), []);

  async function load() {
    setLoading(true);
    setErrorText(null);

    const { data: sessionData, error: sessErr } = await supabase.auth.getSession();
    if (sessErr || !sessionData.session?.user) {
      setErrorText("Not signed in");
      setRows([]);
      setLoading(false);
      return;
    }

    const uid = sessionData.session.user.id;

    // ✅ GUARANTEED-MINIMAL CONTRACT
    const { data, error } = await supabase
      .from("v_tonight_episodes")
      .select(
        "user_id, episode_id, show_id, show_title, service_id, service_name, season, episode, air_date_local"
      )
      .eq("user_id", uid)
      .eq("air_date_local", todayKey)
      .order("show_title", { ascending: true });

    if (error) {
      setErrorText(error.message);
      setRows([]);
      setLoading(false);
      return;
    }

    setRows((data ?? []) as Row[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const visible = rows.filter((r) => !watchedLocal.has(r.episode_id));

  async function handleOpen(r: Row) {
    try {
      setBusyEpisodeId(r.episode_id);

      // Intent-first telemetry still works
      await logOpenService({ episodeId: r.episode_id, serviceId: r.service_id ?? null });

      Alert.alert(
        "Open",
        `This episode is on ${r.service_name ?? "its streaming service"}`
      );
    } finally {
      setBusyEpisodeId(null);
    }
  }

  async function handleWatched(r: Row) {
    try {
      setBusyEpisodeId(r.episode_id);

      setWatchedLocal((prev) => {
        const next = new Set(prev);
        next.add(r.episode_id);
        return next;
      });

      setLastWatched(r);
      setToastVisible(true);

      await logWatched({ episodeId: r.episode_id });
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
        <Text style={{ fontSize: 22, fontWeight: "900" }}>Tonight</Text>
        <Text style={{ color: "#b00020" }}>Error: {errorText}</Text>

        <Pressable
          onPress={load}
          style={{ padding: 14, borderRadius: 12, borderWidth: 1, alignItems: "center" }}
        >
          <Text style={{ fontWeight: "900" }}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 30 }}>
        <Text style={{ fontSize: 22, fontWeight: "900" }}>Tonight</Text>

        {visible.length === 0 ? (
          <EmptyState
            title="Nothing new tonight 🍿"
            subtitle="Check back tomorrow — new episodes drop every day."
          />
        ) : (
          <View style={{ marginTop: 18, gap: 10 }}>
            {visible.map((r) => (
              <EpisodeCard
                key={r.episode_id}
                row={r}
                busy={busyEpisodeId === r.episode_id}
                onOpen={handleOpen}
                onWatched={handleWatched}
              />
            ))}
          </View>
        )}
      </ScrollView>

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
