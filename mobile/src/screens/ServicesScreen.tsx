// mobile/src/screens/ServicesScreen.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  Alert,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { supabase } from "../lib/supabase";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ServicesStackParamList } from "../navigation/ServicesStack";
import { useRefreshBus } from "../context/RefreshBus";
import { THEME } from "../lib/theme";

import { Screen } from "../components/Screen";
import { AppHeader } from "../components/AppHeader";
import { EmptyState } from "../components/EmptyState";
import { GlassCard } from "../components/GlassCard";
import { Button } from "../components/Button";

type Props = NativeStackScreenProps<ServicesStackParamList, "ServicesMain">;

type StreamingService = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
};

export default function ServicesScreen({ navigation }: Props) {
  const { bump } = useRefreshBus();
  const { t } = useTranslation();

  const [services, setServices] = useState<StreamingService[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const selectedCount = useMemo(() => selectedIds.size, [selectedIds]);

  const subtitle = useMemo(() => {
    // Uses _one/_other via pluralization
    return t("services.selectedCount", { count: selectedCount, defaultValue: `${selectedCount} selected` });
  }, [selectedCount, t]);

  const toggle = (serviceId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(serviceId)) next.delete(serviceId);
      else next.add(serviceId);
      return next;
    });
  };

  const load = useCallback(async () => {
    const { data: sessionData, error: sessErr } = await supabase.auth.getSession();
    if (sessErr) {
      Alert.alert(t("services.alerts.authErrorTitle"), sessErr.message);
      setServices([]);
      setSelectedIds(new Set());
      return;
    }

    const uid = sessionData.session?.user?.id;
    if (!uid) {
      setServices([]);
      setSelectedIds(new Set());
      return;
    }

    const svc = await supabase
      .from("streaming_services")
      .select("id,name,slug,active")
      .eq("active", true)
      .order("name", { ascending: true });

    if (svc.error) {
      Alert.alert(t("services.alerts.errorTitle"), svc.error.message);
      setServices([]);
      return;
    }

    const us = await supabase.from("user_services").select("service_id").eq("user_id", uid);
    if (us.error) {
      Alert.alert(t("services.alerts.errorTitle"), us.error.message);
      setServices((svc.data ?? []) as any);
      setSelectedIds(new Set());
      return;
    }

    setServices((svc.data ?? []) as any);
    setSelectedIds(new Set<string>((us.data ?? []).map((r: any) => r.service_id)));
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await load();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const onSave = useCallback(async () => {
    const { data: sessionData, error: sessErr } = await supabase.auth.getSession();
    if (sessErr) return Alert.alert(t("services.alerts.authErrorTitle"), sessErr.message);

    const uid = sessionData.session?.user?.id;
    if (!uid) return Alert.alert(t("services.alerts.notSignedInTitle"), t("services.alerts.notSignedInBody"));

    if (selectedIds.size === 0) {
      return Alert.alert(t("services.alerts.pickAtLeastOneTitle"), t("services.alerts.pickAtLeastOneBody"));
    }

    setSaving(true);
    try {
      const del = await supabase.from("user_services").delete().eq("user_id", uid);
      if (del.error) throw del.error;

      const rows = Array.from(selectedIds).map((serviceId) => ({ user_id: uid, service_id: serviceId }));
      const ins = await supabase.from("user_services").insert(rows);
      if (ins.error) throw ins.error;

      bump();
      Alert.alert(
        t("services.alerts.savedTitle"),
        t("services.alerts.savedBody", { count: rows.length })
      );
    } catch (e: any) {
      Alert.alert(t("services.alerts.saveFailedTitle"), e?.message ?? t("services.alerts.errorUnknown"));
    } finally {
      setSaving(false);
    }
  }, [selectedIds, bump, t]);

  const setAll = (value: boolean) => {
    if (value) setSelectedIds(new Set(services.map((s) => s.id)));
    else setSelectedIds(new Set());
  };

  if (loading) {
    return (
      <Screen padded={false}>
        <View style={{ flex: 1, backgroundColor: THEME.bgSolid }}>
          <AppHeader title={t("services.title")} subtitle={subtitle} />
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <View style={{ flex: 1, backgroundColor: THEME.bgSolid }}>
        <AppHeader
          title={t("services.title")}
          subtitle={subtitle}
          rightLabel={t("common.save")}
          onRightPress={saving ? undefined : onSave}
        />

        <FlatList
          data={services}
          keyExtractor={(s) => s.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.textDim} />}
          contentContainerStyle={{
            paddingHorizontal: THEME.pagePad ?? 18,
            paddingTop: 14,
            paddingBottom: 28,
          }}
          ListHeaderComponent={
            <GlassCard style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: "row" }}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Button label={t("services.selectAll")} variant="secondary" onPress={() => setAll(true)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button label={t("common.clear")} variant="secondary" onPress={() => setAll(false)} />
                </View>
              </View>

              <View style={{ marginTop: 12 }}>
                <Button
                  label={t("services.selectShows")}
                  variant="ghost"
                  onPress={() => navigation.navigate("SelectShows")}
                />
              </View>

              <View style={{ marginTop: 10 }}>
                <Button
                  label={t("services.addShowSearch")}
                  variant="secondary"
                  onPress={() => navigation.navigate("AddShow")}
                />
              </View>

              <Text style={{ marginTop: 10, color: THEME.textMuted, fontSize: 12, lineHeight: 16 }}>
                {t("services.helperText")}
              </Text>
            </GlassCard>
          }
          ListEmptyComponent={
            <GlassCard>
              <EmptyState title={t("services.emptyTitle")} subtitle={t("services.emptySubtitle")} />
            </GlassCard>
          }
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => {
            const selected = selectedIds.has(item.id);

            return (
              <Pressable
                onPress={() => toggle(item.id)}
                style={{
                  padding: 14,
                  borderRadius: THEME.r.md,
                  borderWidth: 1,
                  borderColor: selected ? THEME.accentSoft : THEME.borderSoft,
                  backgroundColor: selected ? THEME.accentSoft : "rgba(20,20,28,0.72)",
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
                        borderColor: selected ? THEME.accent : THEME.borderSoft,
                        backgroundColor: selected ? THEME.accentSoft : "rgba(255,255,255,0.06)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {selected ? <Ionicons name="checkmark" size={16} color={THEME.text} /> : null}
                    </View>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: "900", color: THEME.text }}>{item.name}</Text>
                    <Text style={{ marginTop: 4, color: THEME.textMuted }}>{item.slug}</Text>
                  </View>
                </View>
              </Pressable>
            );
          }}
          ListFooterComponent={
            <View style={{ marginTop: 14 }}>
              <Button
                label={saving ? t("common.saving") : t("common.save")}
                variant="primary"
                size="lg"
                onPress={onSave}
                loading={saving}
              />
              <Text style={{ marginTop: 10, color: THEME.textMuted, fontSize: 12, textAlign: "center" }}>
                {t("services.tipRefresh")}
              </Text>
            </View>
          }
        />
      </View>
    </Screen>
  );
}