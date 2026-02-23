import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useRefreshBus } from "../context/RefreshBus";
import { localMyShowsRepo as repo, type Row } from "../lib/myShowsRepo";

function fmtNext(r: Row) {
  if (!r.next_air_date_local_date) return "No upcoming schedule";
  const se =
    r.next_season != null && r.next_episode != null
      ? ` • S${r.next_season}E${r.next_episode}`
      : "";
  const svc = r.next_service_name ? ` • ${r.next_service_name}` : "";
  return `${r.next_air_date_local_date}${se}${svc}`;
}

export default function MyShowsScreen() {
  const { tick } = useRefreshBus();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  async function load() {
    setLoading(true);
    try {
      const list = await repo.load();
      setRows(list ?? []);
    } catch (e: any) {
      Alert.alert("Load failed", e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const sorted = useMemo(() => {
    const a = [...rows];
    a.sort((x, y) => {
      const xHas = x.next_air_date_local_date ? 1 : 0;
      const yHas = y.next_air_date_local_date ? 1 : 0;
      if (xHas !== yHas) return yHas - xHas; // non-null first
      const xd = x.next_air_date_local_date ?? "9999-12-31";
      const yd = y.next_air_date_local_date ?? "9999-12-31";
      return xd.localeCompare(yd);
    });
    return a;
  }, [rows]);

  async function updateSettings(show_id: string, patch: Partial<Row>) {
    // only include known columns
    const payload: any = {};
    if (typeof patch.is_following === "boolean")
      payload.is_following = patch.is_following;
    if (typeof patch.notify_day_of === "boolean")
      payload.notify_day_of = patch.notify_day_of;
    if (typeof patch.notify_drop === "boolean")
      payload.notify_drop = patch.notify_drop;
    if (typeof patch.day_of_minutes === "number")
      payload.day_of_minutes = patch.day_of_minutes;

    try {
      await repo.updateSettings(show_id, payload);
    } catch (e: any) {
      Alert.alert("Update failed", e?.message ?? "Unknown error");
    }
  }

  async function bumpMinutes(r: Row, delta: number) {
    const next = Math.max(0, Math.min(240, (r.day_of_minutes ?? 30) + delta));
    await updateSettings(r.show_id, { day_of_minutes: next });
    await load();
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
        <Text style={{ marginTop: 8 }}>Loading My Shows…</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>My Shows</Text>

      {sorted.map((r) => (
        <View
          key={r.show_id}
          style={{
            borderWidth: 1,
            borderColor: "#222",
            borderRadius: 12,
            padding: 12,
            gap: 8,
          }}
        >
          <View style={{ flexDirection: "row", gap: 12 }}>
            {!!r.poster_url && (
              <Image
                source={{ uri: r.poster_url }}
                style={{ width: 56, height: 84, borderRadius: 8 }}
              />
            )}

            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontSize: 16, fontWeight: "700" }}>
                {r.show_title}
              </Text>
              <Text style={{ opacity: 0.9 }}>{fmtNext(r)}</Text>

              {!!r.next_service_logo_url && (
                <Image
                  source={{ uri: r.next_service_logo_url }}
                  style={{ width: 28, height: 28 }}
                />
              )}
            </View>
          </View>

          {/* Toggles */}
          <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
            <Pressable
              onPress={async () => {
                await updateSettings(r.show_id, {
                  is_following: !r.is_following,
                });
                await load();
              }}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 10,
                borderWidth: 1,
                borderRadius: 10,
              }}
            >
              <Text>Following: {r.is_following ? "ON" : "OFF"}</Text>
            </Pressable>

            <Pressable
              onPress={async () => {
                await updateSettings(r.show_id, {
                  notify_day_of: !r.notify_day_of,
                });
                await load();
              }}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 10,
                borderWidth: 1,
                borderRadius: 10,
              }}
            >
              <Text>Day-of: {r.notify_day_of ? "ON" : "OFF"}</Text>
            </Pressable>

            <Pressable
              onPress={async () => {
                await updateSettings(r.show_id, {
                  notify_drop: !r.notify_drop,
                });
                await load();
              }}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 10,
                borderWidth: 1,
                borderRadius: 10,
              }}
            >
              <Text>Drop: {r.notify_drop ? "ON" : "OFF"}</Text>
            </Pressable>
          </View>

          {/* Lead time */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text style={{ fontWeight: "600" }}>Lead:</Text>
            <Pressable
              onPress={() => bumpMinutes(r, -5)}
              style={{ padding: 8, borderWidth: 1, borderRadius: 10 }}
            >
              <Text>-5</Text>
            </Pressable>
            <Text style={{ minWidth: 60, textAlign: "center" }}>
              {r.day_of_minutes} min
            </Text>
            <Pressable
              onPress={() => bumpMinutes(r, +5)}
              style={{ padding: 8, borderWidth: 1, borderRadius: 10 }}
            >
              <Text>+5</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
