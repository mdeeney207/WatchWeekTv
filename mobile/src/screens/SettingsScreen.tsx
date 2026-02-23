// mobile/src/screens/SettingsScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, Alert, Pressable, Switch, Platform, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { useTranslation } from "react-i18next";

import { supabase } from "../lib/supabase";
import { THEME } from "../lib/theme";
import { Screen } from "../components/Screen";
import { AppHeader } from "../components/AppHeader";
import { GlassCard } from "../components/GlassCard";
import { Button } from "../components/Button";
import { useRefreshBus } from "../context/RefreshBus";

// ✅ import the key from ONE place (notifications.ts)
import { STORAGE_REMINDERS_ENABLED } from "../lib/notifications";

// ✅ i18n language toggle helpers
import { setAppLanguage, getSavedAppLanguage, clearAppLanguageOverride } from "../i18n";

type SyncState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "running"; total: number; done: number }
  | { status: "done"; total: number; ok: number; failed: number };

type Lang = "en" | "es" | "zh" | "ru";

export default function SettingsScreen() {
  const { bump } = useRefreshBus();
  const { t, i18n } = useTranslation();

  const [signingOut, setSigningOut] = useState(false);

  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [notifEnabled, setNotifEnabled] = useState(true);
  const [notifLoaded, setNotifLoaded] = useState(false);

  const [clearing, setClearing] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>({ status: "idle" });

  // language toggle state (manual override indicator)
  const [langOverride, setLangOverride] = useState<string | null>(null);

  const extra: any =
    (Constants.expoConfig as any)?.extra ?? (Constants.manifest as any)?.extra ?? {};
  const projectId =
    (Constants.expoConfig as any)?.extra?.eas?.projectId ??
    (Constants.expoConfig as any)?.extra?.projectId ??
    extra?.projectId ??
    extra?.eas?.projectId ??
    null;

  // session info
  useEffect(() => {
    let alive = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      const sess = data.session;

      if (!alive) return;
      setEmail(sess?.user?.email ?? null);
      setUserId(sess?.user?.id ?? null);
    })();

    return () => {
      alive = false;
    };
  }, []);

  // ✅ load language override status
  useEffect(() => {
    let alive = true;

    (async () => {
      const saved = await getSavedAppLanguage();
      if (!alive) return;
      setLangOverride(saved);
    })();

    return () => {
      alive = false;
    };
  }, []);

  const setLanguage = useCallback(
    async (lang: Lang) => {
      try {
        await setAppLanguage(lang);
        setLangOverride(lang);
      } catch (e: any) {
        Alert.alert("Save failed", e?.message ?? "Could not change language.");
      }
    },
    []
  );

  const resetToDeviceLanguage = useCallback(async () => {
    try {
      const next = await clearAppLanguageOverride();
      setLangOverride(null);
      Alert.alert("Language reset", `Using device language (${next}).`);
    } catch (e: any) {
      Alert.alert("Reset failed", e?.message ?? "Could not reset language.");
    }
  }, []);

  // ✅ load notifications toggle (single key only)
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_REMINDERS_ENABLED);
        if (!alive) return;

        // default ON unless explicitly "0"
        if (raw == null) {
          setNotifEnabled(true);
          // materialize so other screens never see null
          await AsyncStorage.setItem(STORAGE_REMINDERS_ENABLED, "1");
          console.log("[Settings] reminders key missing -> set default 1");
          console.log("[Settings] reminders raw:", null);
          console.log("[Settings] reminders enabled computed:", true);
        } else {
          const enabled = raw !== "0";
          setNotifEnabled(enabled);
          console.log("[Settings] reminders raw:", raw);
          console.log("[Settings] reminders enabled computed:", enabled);
        }
      } catch (e: any) {
        console.log("[Settings] reminders load error:", e?.message ?? e);
        setNotifEnabled(true);
        try {
          await AsyncStorage.setItem(STORAGE_REMINDERS_ENABLED, "1");
        } catch {}
      } finally {
        if (alive) setNotifLoaded(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const setNotifPref = useCallback(async (value: boolean) => {
    setNotifEnabled(value);
    try {
      await AsyncStorage.setItem(STORAGE_REMINDERS_ENABLED, value ? "1" : "0");
      console.log("[Settings] reminders set:", value ? "1" : "0");

      // verify write (helps catch weird storage issues / old bundle)
      const verify = await AsyncStorage.getItem(STORAGE_REMINDERS_ENABLED);
      console.log("[Settings] reminders verify:", verify);
    } catch (e: any) {
      console.log("[Settings] reminders save error:", e?.message ?? e);
      Alert.alert("Save failed", "Could not save notification preference.");
    }
  }, []);

  const doSignOut = useCallback(async () => {
    setSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      Alert.alert("Signed out", "You are signed out.");
    } catch (e: any) {
      Alert.alert("Sign out failed", e?.message ?? "Unknown error");
    } finally {
      setSigningOut(false);
    }
  }, []);

  const forceRefresh = useCallback(() => {
    bump();
    Alert.alert("Refreshed", "Week/Tonight will reload.");
  }, [bump]);

  const clearLocalCache = useCallback(() => {
    Alert.alert(
      "Clear local cache?",
      "This will wipe local app storage (preferences and cached data). You may need to sign in again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            setClearing(true);
            try {
              await AsyncStorage.clear();
              bump();
              Alert.alert("Cleared", "Local cache cleared.");
            } catch (e: any) {
              Alert.alert("Clear failed", e?.message ?? "Unknown error");
            } finally {
              setClearing(false);
            }
          }
        }
      ]
    );
  }, [bump]);

  const resyncMyShows = useCallback(async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) return Alert.alert("Auth error", error.message);

    const uid = data.session?.user?.id;
    if (!uid) return Alert.alert("Not signed in", "Please sign in again.");

    setSyncState({ status: "loading" });

    try {
      const { data: rows, error: qErr } = await supabase
        .from("user_shows")
        .select("show_id, shows!inner(tmdb_id)")
        .eq("user_id", uid);

      if (qErr) throw qErr;

      const tmdbIds = (rows ?? [])
        .map((r: any) => r?.shows?.tmdb_id)
        .filter((x: any) => typeof x === "number") as number[];

      const uniq = Array.from(new Set(tmdbIds));
      const total = uniq.length;

      if (total === 0) {
        setSyncState({ status: "done", total: 0, ok: 0, failed: 0 });
        return Alert.alert("Nothing to sync", "You aren’t following any shows yet.");
      }

      setSyncState({ status: "running", total, done: 0 });

      let ok = 0;
      let failed = 0;

      for (let i = 0; i < uniq.length; i++) {
        const id = uniq[i];
        try {
          const { error: invErr } = await supabase.functions.invoke("sync_show", {
            body: { tmdb_id: id }
          });
          if (invErr) throw invErr;
          ok++;
        } catch (e) {
          failed++;
          console.log("[Settings] sync_show failed tmdb_id:", id, e);
        } finally {
          setSyncState({ status: "running", total, done: i + 1 });
        }
      }

      setSyncState({ status: "done", total, ok, failed });
      bump();

      Alert.alert(
        "Re-sync complete",
        failed === 0
          ? `Synced ${ok}/${total} shows.`
          : `Synced ${ok}/${total} shows. Failed: ${failed}. (Check logs)`
      );
    } catch (e: any) {
      console.log("[Settings] resync error:", e?.message ?? e);
      setSyncState({ status: "idle" });
      Alert.alert("Re-sync failed", e?.message ?? "Unknown error");
    }
  }, [bump]);

  const syncSubtitle = useMemo(() => {
    if (syncState.status === "idle") return "Re-fetch episodes for all shows you follow.";
    if (syncState.status === "loading") return "Loading followed shows…";
    if (syncState.status === "running") return `Syncing ${syncState.done}/${syncState.total}…`;
    return `Done. OK: ${syncState.ok}, Failed: ${syncState.failed}`;
  }, [syncState]);

  const rowStyle = {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: THEME.r.md,
    borderWidth: 1,
    borderColor: THEME.borderSoft,
    backgroundColor: THEME.panel
  };

  const langLabel = useMemo(() => {
    const base = (i18n.language || "en").split("-")[0].toLowerCase();
    if (base === "es") return "Español";
    if (base === "zh") return "中文";
    if (base === "ru") return "Русский";
    return "English";
  }, [i18n.language]);

  const langChip = (lang: Lang, label: string) => {
    const cur = (i18n.language || "en").split("-")[0].toLowerCase();
    const selected = cur === lang;

    return (
      <Pressable
        onPress={() => setLanguage(lang)}
        style={{
          paddingVertical: 10,
          paddingHorizontal: 12,
          borderRadius: THEME.r.md,
          borderWidth: 1,
          borderColor: selected ? THEME.accentSoft : THEME.borderSoft,
          backgroundColor: selected ? THEME.accentSoft : THEME.panel,
          flex: 1,
          alignItems: "center",
          ...(THEME.shadow?.card ?? {})
        }}
      >
        <Text style={{ fontWeight: "900", color: THEME.text }}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <Screen padded={false}>
      <View style={{ flex: 1, backgroundColor: THEME.bgSolid }}>
        <AppHeader title="Settings" subtitle={email ?? ""} />

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: THEME.pagePad ?? 18,
            paddingTop: 14,
            paddingBottom: 28,
            gap: 12
          }}
        >
          {/* Language */}
          <GlassCard>
            <Text style={{ fontSize: 16, fontWeight: "900", color: THEME.text }}>Language</Text>

            <Text style={{ marginTop: 6, color: THEME.textMuted, fontSize: 12 }}>
              Current: {langLabel}
              {langOverride ? " (manual)" : " (device)"}
            </Text>

            <View style={{ marginTop: 12, flexDirection: "row", gap: 10 }}>
              {langChip("en", "English")}
              {langChip("es", "Español")}
            </View>

            {/* Phase 2 languages (enabled now, translations may be sparse) */}
            <View style={{ marginTop: 10, flexDirection: "row", gap: 10 }}>
              {langChip("zh", "中文")}
              {langChip("ru", "Русский")}
            </View>

            <View style={{ marginTop: 10 }}>
              <Button
                label="Reset to device language"
                variant="ghost"
                onPress={resetToDeviceLanguage}
              />
            </View>
          </GlassCard>

          {/* Notifications */}
          <GlassCard>
            <Text style={{ fontSize: 16, fontWeight: "900", color: THEME.text }}>Notifications</Text>

            <View style={{ marginTop: 12, gap: 10 }}>
              <View style={rowStyle}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Ionicons name="notifications-outline" size={18} color={THEME.textDim} />
                  <View>
                    <Text style={{ fontWeight: "900", color: THEME.text }}>Enable reminders</Text>
                    <Text style={{ marginTop: 2, color: THEME.textMuted, fontSize: 12 }}>
                      Stored locally (doesn’t schedule by itself)
                    </Text>
                  </View>
                </View>

                <Switch value={notifEnabled} onValueChange={setNotifPref} disabled={!notifLoaded} />
              </View>

              <Text style={{ color: THEME.textMuted, fontSize: 12, lineHeight: 16 }}>
                Key: {STORAGE_REMINDERS_ENABLED}
              </Text>
            </View>
          </GlassCard>

          {/* Data / Maintenance */}
          <GlassCard>
            <Text style={{ fontSize: 16, fontWeight: "900", color: THEME.text }}>Data</Text>

            <View style={{ marginTop: 12, gap: 10 }}>
              <Button
                label={
                  syncState.status === "running" || syncState.status === "loading"
                    ? "Re-sync running…"
                    : "Re-sync my shows"
                }
                variant="secondary"
                onPress={resyncMyShows}
                loading={syncState.status === "running" || syncState.status === "loading"}
              />
              <Text style={{ marginTop: 2, color: THEME.textMuted, fontSize: 12 }}>
                {syncSubtitle}
              </Text>

              <Button label="Force refresh (UI)" variant="ghost" onPress={forceRefresh} />

              <Button
                label={clearing ? "Clearing…" : "Clear local cache"}
                variant="secondary"
                onPress={clearLocalCache}
                loading={clearing}
              />
            </View>
          </GlassCard>

          {/* Account */}
          <GlassCard>
            <Text style={{ fontSize: 16, fontWeight: "900", color: THEME.text }}>Account</Text>

            <View style={{ marginTop: 12, gap: 10 }}>
              <Button
                label={signingOut ? "Signing out…" : "Sign out"}
                variant="secondary"
                onPress={doSignOut}
                loading={signingOut}
              />
            </View>

            <Text style={{ marginTop: 10, color: THEME.textMuted, fontSize: 12, lineHeight: 16 }}>
              If you sign out you’ll need to re-authenticate to see your calendar.
            </Text>
          </GlassCard>

          {/* Debug */}
          <GlassCard>
            <Text style={{ fontSize: 16, fontWeight: "900", color: THEME.text }}>Debug</Text>

            <View style={{ marginTop: 12, gap: 10 }}>
              <Pressable
                onPress={() =>
                  Alert.alert(
                    "Build info",
                    [
                      `Platform: ${Platform.OS}`,
                      `ProjectId: ${projectId ?? "n/a"}`,
                      `AppOwnership: ${(Constants as any)?.appOwnership ?? "n/a"}`,
                      `UserId: ${userId ?? "n/a"}`,
                      `Email: ${email ?? "n/a"}`
                    ].join("\n")
                  )
                }
                style={rowStyle}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Ionicons name="bug-outline" size={18} color={THEME.textDim} />
                  <Text style={{ fontWeight: "900", color: THEME.text }}>
                    Show build/session info
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={THEME.textDim} />
              </Pressable>

              <Pressable
                onPress={async () => {
                  try {
                    const raw = await AsyncStorage.getItem(STORAGE_REMINDERS_ENABLED);
                    const enabled = raw == null ? true : raw !== "0";
                    console.log("[Settings] reminders raw:", raw);
                    console.log("[Settings] reminders enabled computed:", enabled);
                    Alert.alert(
                      "Reminders pref",
                      [`Key: ${STORAGE_REMINDERS_ENABLED}`, `Raw: ${raw ?? "null"}`, `Enabled: ${enabled}`].join("\n")
                    );
                  } catch (e: any) {
                    console.log("[Settings] reminders debug read error:", e?.message ?? e);
                  }
                }}
                style={rowStyle}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Ionicons name="list-outline" size={18} color={THEME.textDim} />
                  <Text style={{ fontWeight: "900", color: THEME.text }}>Dump reminders pref</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={THEME.textDim} />
              </Pressable>
            </View>
          </GlassCard>

          {/* About */}
          <GlassCard>
            <Text style={{ fontSize: 16, fontWeight: "900", color: THEME.text }}>About</Text>
            <Text style={{ marginTop: 8, color: THEME.textMuted, lineHeight: 18 }}>
              WatchWeek — weekly TV calendar + reminders.
            </Text>
          </GlassCard>
        </ScrollView>
      </View>
    </Screen>
  );
}