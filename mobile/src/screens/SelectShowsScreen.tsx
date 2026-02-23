import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { supabase } from "../lib/supabase";
import { useRefreshBus } from "../context/RefreshBus";
import type { ServicesStackParamList } from "../navigation/ServicesStack";
import { THEME } from "../lib/theme";

type Props = NativeStackScreenProps<ServicesStackParamList, "SelectShows">;

type ShowRow = { id: string; title: string; tmdb_id: number };

export default function SelectShowsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { bump, subscribe, token } = useRefreshBus(); // token optional if you restore it

  const [shows, setShows] = useState<ShowRow[]>([]);
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const enabledCount = useMemo(() => Object.values(enabled).filter(Boolean).length, [enabled]);

  const load = useCallback(async () => {
    setLoading(true);

    const { data: sess } = await supabase.auth.getSession();
    const userId = sess.session?.user?.id;

    if (!userId) {
      setLoading(false);
      Alert.alert("Not signed in", "Please sign in again.");
      return;
    }

    const us = await supabase.from("user_shows").select("show_id").eq("user_id", userId);
    if (us.error) {
      setLoading(false);
      Alert.alert("Load failed", us.error.message);
      return;
    }

    const ids = (us.data ?? []).map((r: any) => r.show_id).filter(Boolean);

    if (ids.length === 0) {
      setShows([]);
      setEnabled({});
      setLoading(false);
      return;
    }

    const s = await supabase.from("shows").select("id,title,tmdb_id").in("id", ids);
    if (s.error) {
      setLoading(false);
      Alert.alert("Load failed", s.error.message);
      return;
    }

    const normalized: ShowRow[] = (s.data ?? []).map((r: any) => ({
      id: r.id,
      title: r.title,
      tmdb_id: r.tmdb_id,
    }));

    const selected = new Set(ids);
    const next: Record<string, boolean> = {};
    normalized.forEach((sh) => (next[sh.id] = selected.has(sh.id)));

    setShows(normalized.sort((a, b) => a.title.localeCompare(b.title)));
    setEnabled(next);
    setLoading(false);
  }, []);

  // ✅ Works with token-based refresh AND bus-subscribe refresh
  useEffect(() => {
    load();
  }, [load, token]);

  useEffect(() => {
    // If you ever migrate off token, this keeps it refreshing.
    const unsub = subscribe(() => {
      load().catch(() => {});
    });
    return unsub;
  }, [subscribe, load]);

  const toggle = (id: string) => setEnabled((p) => ({ ...p, [id]: !p[id] }));

  const setAll = (value: boolean) => {
    const next: Record<string, boolean> = {};
    shows.forEach((s) => (next[s.id] = value));
    setEnabled(next);
  };

  const save = async () => {
    setSaving(true);

    const { data: sess } = await supabase.auth.getSession();
    const userId = sess.session?.user?.id;

    if (!userId) {
      setSaving(false);
      Alert.alert("Not signed in", "Please sign in again.");
      return;
    }

    const selectedIds = Object.entries(enabled)
      .filter(([, v]) => v)
      .map(([k]) => k);

    const del = await supabase.from("user_shows").delete().eq("user_id", userId);
    if (del.error) {
      setSaving(false);
      Alert.alert("Save failed", del.error.message);
      return;
    }

    if (selectedIds.length) {
      const ins = await supabase
        .from("user_shows")
        .insert(selectedIds.map((show_id) => ({ user_id: userId, show_id })));

      if (ins.error) {
        setSaving(false);
        Alert.alert("Save failed", ins.error.message);
        return;
      }
    }

    setSaving(false);
    bump();
    Alert.alert("Saved", `${selectedIds.length} shows selected`);
  };

  const rootBg = { backgroundColor: "transparent" as const };

  const glassBtn = {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: THEME.r.md,
    borderWidth: 1,
    borderColor: THEME.borderSoft,
    backgroundColor: THEME.panel,
    alignItems: "center" as const,
    ...THEME.shadow.card,
  };

  const primaryBtn = {
    ...glassBtn,
    borderColor: THEME.accentSoft,
    backgroundColor: THEME.accentSoft,
  };

  if (loading) {
    return (
      <View style={[{ flex: 1, alignItems: "center", justifyContent: "center" }, rootBg]}>
        <ActivityIndicator />
        <Text style={{ marginTop: 10, color: THEME.textMuted, fontWeight: "800" }}>Loading…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[{ flex: 1 }, rootBg]}
      contentContainerStyle={{
        paddingHorizontal: 18,
        paddingTop: insets.top + 10,
        paddingBottom: 24,
      }}
    >
      <Text style={{ fontSize: 20, fontWeight: "900", color: THEME.text }}>Select Shows</Text>
      <Text style={{ color: THEME.textMuted, marginTop: 6 }}>{enabledCount} selected</Text>

      {/* Top actions (no gap) */}
      <View style={{ flexDirection: "row", marginTop: 12 }}>
        <Pressable onPress={() => setAll(true)} style={[glassBtn, { flex: 1, marginRight: 10 }]} disabled={saving}>
          <Text style={{ fontWeight: "900", color: THEME.text }}>Select all</Text>
        </Pressable>

        <Pressable onPress={() => setAll(false)} style={[glassBtn, { flex: 1 }]} disabled={saving}>
          <Text style={{ fontWeight: "900", color: THEME.text }}>Clear</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() => navigation.navigate("AddShow")}
        style={[primaryBtn, { marginTop: 12 }]}
        disabled={saving}
      >
        <Text style={{ fontWeight: "900", color: THEME.text }}>Add Show (Search)</Text>
      </Pressable>

      <View style={{ marginTop: 14 }}>
        {shows.length === 0 ? (
          <View
            style={{
              padding: 14,
              borderRadius: THEME.r.md,
              borderWidth: 1,
              borderColor: THEME.borderSoft,
              backgroundColor: THEME.panel,
              ...THEME.shadow.card,
            }}
          >
            <Text style={{ fontWeight: "900", color: THEME.text }}>No shows yet</Text>
            <Text style={{ color: THEME.textMuted, marginTop: 6 }}>
              Tap “Add Show” to search and add real shows.
            </Text>
          </View>
        ) : (
          shows.map((s) => {
            const on = !!enabled[s.id];
            return (
              <Pressable
                key={s.id}
                onPress={() => toggle(s.id)}
                disabled={saving}
                style={{
                  padding: 14,
                  borderRadius: THEME.r.md,
                  borderWidth: 1,
                  borderColor: on ? THEME.accentSoft : THEME.borderSoft,
                  backgroundColor: on ? THEME.accentSoft : THEME.panel,
                  marginBottom: 10,
                  opacity: saving ? 0.6 : 1,
                  ...THEME.shadow.card,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={{ marginRight: 10 }}>
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 7,
                        borderWidth: 1,
                        borderColor: on ? THEME.accent : THEME.borderSoft,
                        backgroundColor: on ? THEME.accentSoft : THEME.panelStrong,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {on ? <Ionicons name="checkmark" size={16} color={THEME.text} /> : null}
                    </View>
                  </View>

                  <Text style={{ fontWeight: "900", color: THEME.text, flex: 1 }} numberOfLines={2}>
                    {s.title}
                  </Text>
                </View>

                <Text style={{ color: THEME.textMuted, marginTop: 6 }}>TMDB: {s.tmdb_id}</Text>
              </Pressable>
            );
          })
        )}
      </View>

      <Pressable
        onPress={save}
        disabled={saving}
        style={[primaryBtn, { marginTop: 10, opacity: saving ? 0.6 : 1 }]}
      >
        <Text style={{ fontWeight: "900", color: THEME.text }}>{saving ? "Saving…" : "Save"}</Text>
      </Pressable>
    </ScrollView>
  );
}
