// mobile/src/screens/AddShowScreen.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { supabase } from "../lib/supabase";
import { tmdbPosterUrl, tmdbSearchTv, type TmdbSearchTvResult } from "../lib/tmdb";
import { useRefreshBus } from "../context/RefreshBus";
import { THEME } from "../lib/theme";
import { getBadgesForTmdbShowUS, type ShowServiceBadge } from "../lib/showServices";

import { Screen } from "../components/Screen";
import { Section } from "../components/Section";
import ServicePicker from "../components/ServicePicker";

type StrId = string;

type UserServiceRow = {
  id: StrId;
  name: string;
  slug?: string | null;
  logo_url?: string | null;
  tmdb_provider_id?: number | null;
};

type PickMode = "recommended" | "all";
type OfferType = "flatrate" | "ads";

type DbShowServiceRow = {
  service_id: string;
  offer_type: OfferType;
  provider_show_id: string | null;
  is_manual: boolean;
};

type AddOpts = {
  isManual: boolean;
  showIdOverride: string | null;
};

/* =====================================================================================
   ⭐ SEARCH PROVIDER PREVIEW RULES (EASY TO FIND / EDIT)
   - Search cards must look clean:
     1) ONE pill per service_id (dedupe variants)                   ✅
     2) Prefer flatrate over ads                                    ✅
     3) Collapse "channel" variants into parent brand (Paramount+)  ✅ NEW (fixes clutter)
     4) Sort by SERVICE_PRIORITY                                    ✅
     5) Filter to ONLY major services by name                       ✅
     6) Cap max pills + show +X more                                ✅
     7) Optional fallback: if no majors found, show first N         ✅
   ===================================================================================== */

const SERVICE_PRIORITY = [
  "Netflix",
  "Max",
  "Hulu",
  "Prime Video",
  "Disney+",
  "Apple TV+",
  "Peacock",
  "Paramount+",
];

// How many pills to show on Search cards
const SEARCH_BADGE_MAX = 4;

// If true: when no priority services are present, show first N anyway.
const SEARCH_PREVIEW_FALLBACK_TO_FIRST_N = true;

/**
 * Provider name normalization for priority matching.
 * Keep this small + explicit based on what you actually see in DB/logs.
 */
function normalizeProviderName(name: string) {
  const n = (name || "").trim();

  // Common variants
  if (n === "HBO Max") return "Max";
  if (n === "Disney Plus") return "Disney+";
  if (n === "Amazon Prime Video") return "Prime Video";

  return n;
}

/**
 * Brand grouping to collapse noisy variants into a single major brand.
 * This is what prevents:
 * - "Paramount Plus Apple TV Channel"
 * - "Paramount+ Amazon Channel"
 * - "Paramount Plus Essential"
 * - "Paramount Plus Premium"
 * from eating all the preview slots.
 *
 * IMPORTANT:
 * - We do NOT auto-map "Freevee" to Prime Video.
 * - We do NOT auto-map "Amazon Prime Video with Ads" to Prime Video.
 * Those should stay hidden unless you explicitly prioritize them.
 */
function brandKeyForPreview(name: string) {
  const n = normalizeProviderName(name);

  // Collapse Paramount variants into Paramount+
  if (/^Paramount\+/.test(n)) return "Paramount+";
  if (/^Paramount Plus\b/.test(n)) return "Paramount+";

  // Collapse Prime variants (but NOT "with Ads" per requirement)
  if (n === "Prime Video") return "Prime Video";
  if (n === "Amazon Prime Video") return "Prime Video";

  // Everything else: keep as-is
  return n;
}

function sortBadgesByPriority(badges: ShowServiceBadge[]) {
  const idx = (name: string) => {
    const i = SERVICE_PRIORITY.indexOf(brandKeyForPreview(name));
    return i === -1 ? 9999 : i;
  };

  return [...badges].sort((a, b) => {
    const ai = idx(a.name);
    const bi = idx(b.name);
    if (ai !== bi) return ai - bi;

    // same priority bucket: flatrate before ads, then name
    if (a.offer_type !== b.offer_type) return a.offer_type === "flatrate" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Normalize badges for SEARCH preview:
 * - ONE badge per service_id
 * - Prefer flatrate over ads
 * - If tie, prefer is_primary
 */
function normalizeBadgesForSearch(badges: ShowServiceBadge[]) {
  const bestByService = new Map<string, ShowServiceBadge>();

  for (const b of badges) {
    const key = String(b.service_id);
    const existing = bestByService.get(key);

    if (!existing) {
      bestByService.set(key, b);
      continue;
    }

    const existingScore = existing.offer_type === "flatrate" ? 2 : 1;
    const nextScore = b.offer_type === "flatrate" ? 2 : 1;

    if (nextScore > existingScore) {
      bestByService.set(key, b);
      continue;
    }

    if (nextScore === existingScore) {
      if (!!b.is_primary && !existing.is_primary) bestByService.set(key, b);
    }
  }

  return Array.from(bestByService.values());
}

/**
 * Brand-dedupe after service_id normalization:
 * - Pick ONE badge per brandKey (Paramount+ etc.)
 * - Prefer flatrate, then primary
 */
function dedupeBadgesByBrand(badges: ShowServiceBadge[]) {
  const bestByBrand = new Map<string, ShowServiceBadge>();

  for (const b of badges) {
    const key = brandKeyForPreview(b.name);
    const existing = bestByBrand.get(key);

    if (!existing) {
      bestByBrand.set(key, b);
      continue;
    }

    const existingScore = existing.offer_type === "flatrate" ? 2 : 1;
    const nextScore = b.offer_type === "flatrate" ? 2 : 1;

    if (nextScore > existingScore) {
      bestByBrand.set(key, b);
      continue;
    }

    if (nextScore === existingScore) {
      if (!!b.is_primary && !existing.is_primary) bestByBrand.set(key, b);
    }
  }

  return Array.from(bestByBrand.values());
}

/**
 * Final filter for SEARCH preview row:
 * - normalize (dedupe by service_id)
 * - brand-dedupe (collapse channel variants)
 * - sort by priority
 * - FILTER to only major services by name (SERVICE_PRIORITY)
 * - fallback (optional): if no majors present, return sorted list
 */
function filterBadgesForSearchPreview(badges: ShowServiceBadge[]) {
  const normalized = normalizeBadgesForSearch(badges);
  const brandDeduped = dedupeBadgesByBrand(normalized);
  const sorted = sortBadgesByPriority(brandDeduped);

  const prioritySet = new Set(SERVICE_PRIORITY.map((n) => brandKeyForPreview(n)));
  const majorOnly = sorted.filter((b) => prioritySet.has(brandKeyForPreview(b.name)));

  if (majorOnly.length > 0) return majorOnly;

  // Optional fallback: show something instead of an empty row
  return SEARCH_PREVIEW_FALLBACK_TO_FIRST_N ? sorted : [];
}

function yearFromFirstAirDate(d?: string | null) {
  if (!d) return "";
  return d.slice(0, 4);
}

/**
 * Clean pill row: priority sorted, normalized (deduped), brand-deduped, major-only filtered, +X more.
 * No "primary" label; show a tiny star icon instead.
 */
function BadgePillsCompact(props: { badges: ShowServiceBadge[] }) {
  const { t } = useTranslation();

  const sorted = useMemo(() => {
    return filterBadgesForSearchPreview(props.badges);
  }, [props.badges]);

  const shown = sorted.slice(0, SEARCH_BADGE_MAX);
  const extra = Math.max(0, sorted.length - shown.length);

  return (
    <View style={{ marginTop: 8 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {shown.map((b) => (
          <View
            key={`${b.service_id}:${b.offer_type}`}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingVertical: 4,
              paddingHorizontal: 9,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: THEME.borderSoft,
              backgroundColor: THEME.panel,
            }}
          >
            {b.logo_url ? (
              <Image source={{ uri: b.logo_url }} style={{ width: 14, height: 14, borderRadius: 3 }} />
            ) : (
              <View
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 3,
                  borderWidth: 1,
                  borderColor: THEME.borderSoft,
                  backgroundColor: THEME.panelStrong,
                  opacity: 0.5,
                }}
              />
            )}

            <Text style={{ color: THEME.text, fontSize: 12, fontWeight: "800" }}>{b.name}</Text>

            {b.offer_type === "ads" ? (
              <Text style={{ color: THEME.textDim, fontSize: 11, fontWeight: "800" }}>
                {t("addShow.badgeAds", { defaultValue: "ads" })}
              </Text>
            ) : null}

            {b.is_primary ? <Ionicons name="star" size={12} color={THEME.accent} /> : null}
          </View>
        ))}

        {extra > 0 ? (
          <View
            style={{
              paddingVertical: 4,
              paddingHorizontal: 9,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: THEME.borderSoft,
              backgroundColor: THEME.panel,
            }}
          >
            <Text style={{ color: THEME.textDim, fontSize: 12, fontWeight: "900" }}>
              {t("addShow.moreProviders", { count: extra, defaultValue: `+${extra} more` })}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default function AddShowScreen() {
  const { emit } = useRefreshBus();
  const { t } = useTranslation();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TmdbSearchTvResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // user-selected services
  const [services, setServices] = useState<UserServiceRow[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);

  // badges (US streaming) per tmdb_id
  const [badgesByTmdbId, setBadgesByTmdbId] = useState<Record<number, ShowServiceBadge[]>>({});
  const [badgeLoading, setBadgeLoading] = useState<Record<number, boolean>>({});
  const [badgeFailed, setBadgeFailed] = useState<Record<number, boolean>>({});

  // provider-aware recommendation (DB-truth)
  const [recommendedServices, setRecommendedServices] = useState<UserServiceRow[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pendingItem, setPendingItem] = useState<TmdbSearchTvResult | null>(null);
  const [pendingShowId, setPendingShowId] = useState<string | null>(null);
  const [pickMode, setPickMode] = useState<PickMode>("recommended");
  const [providerContext, setProviderContext] = useState<{
    providerIdByServiceId: Record<string, number>;
    offerTypeByServiceId: Record<string, OfferType>;
  }>({ providerIdByServiceId: {}, offerTypeByServiceId: {} });

  const requestIdRef = useRef(0);

  const canSearch = query.trim().length >= 2 && !loading && !syncing;

  const loadUserServices = useCallback(async () => {
    setServicesLoading(true);
    try {
      const { data: sess, error: sessErr } = await supabase.auth.getSession();
      if (sessErr) throw sessErr;

      const uid = sess.session?.user?.id;
      if (!uid) {
        setServices([]);
        return;
      }

      const us = await supabase.from("user_services").select("service_id").eq("user_id", uid);
      if (us.error) throw us.error;

      const ids = (us.data ?? []).map((r: any) => r.service_id).filter(Boolean) as string[];
      if (ids.length === 0) {
        setServices([]);
        return;
      }

      const svc = await supabase
        .from("streaming_services")
        .select("id,name,slug,logo_url,tmdb_provider_id")
        .in("id", ids)
        .eq("active", true)
        .order("name", { ascending: true });

      if (svc.error) throw svc.error;

      setServices((svc.data ?? []) as any);
    } catch (e: any) {
      if (__DEV__) console.log("[AddShow] loadUserServices error:", e?.message ?? e);
      setServices([]);
    } finally {
      setServicesLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await loadUserServices();
    })();
    return () => {
      cancelled = true;
    };
  }, [loadUserServices]);

  const runSearch = async (raw: string) => {
    const q = raw.trim();
    if (q.length < 2) return;

    const myRequestId = ++requestIdRef.current;
    setLoading(true);

    if (__DEV__) console.log("[AddShow] runSearch()", { q, myRequestId });

    try {
      const r = await tmdbSearchTv(q);
      if (requestIdRef.current === myRequestId) {
        const sliced = (r ?? []).slice(0, 20);
        setResults(sliced);
        setBadgeFailed({});
      }
    } catch (e: any) {
      if (__DEV__) console.log("[AddShow] search error:", e);
      if (requestIdRef.current === myRequestId) {
        Alert.alert(t("addShow.errorSearchTitle", { defaultValue: "TMDB search failed" }), e?.message ?? t("addShow.errorUnknown", { defaultValue: "Unknown error" }));
      }
    } finally {
      if (requestIdRef.current === myRequestId) {
        setLoading(false);
      }
    }
  };

  const doSearch = async () => {
    Keyboard.dismiss();
    await runSearch(query);
  };

  // Auto-search on typing
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    if (syncing) return;

    const tmr = setTimeout(() => runSearch(q), 400);
    return () => clearTimeout(tmr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, syncing]);

  /**
   * Badge fetch loop: after results update, fetch US streaming badges for each show (cached).
   */
  useEffect(() => {
    let cancelled = false;
    const myReq = requestIdRef.current;

    const ids = results.map((r) => r.id).filter((n) => typeof n === "number") as number[];
    if (!ids.length) return;

    (async () => {
      for (const tmdbId of ids) {
        if (cancelled) return;
        if (requestIdRef.current !== myReq) return; // stale search

        if (badgesByTmdbId[tmdbId]) continue;
        if (badgeLoading[tmdbId]) continue;

        setBadgeLoading((prev) => ({ ...prev, [tmdbId]: true }));

        try {
          const badges = await getBadgesForTmdbShowUS(tmdbId);
          if (cancelled) return;
          if (requestIdRef.current !== myReq) return;

          setBadgesByTmdbId((prev) => ({ ...prev, [tmdbId]: badges }));
        } catch (e: any) {
          if (__DEV__) console.log("[AddShow] badge fetch error:", tmdbId, e?.message ?? e);
          setBadgeFailed((prev) => ({ ...prev, [tmdbId]: true }));
        } finally {
          setBadgeLoading((prev) => ({ ...prev, [tmdbId]: false }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results]);

  async function ensureSynced(tmdbId: number) {
    const { data, error } = await supabase.functions.invoke("sync_show", {
      body: { tmdb_id: tmdbId, runtimeConcurrency: 8 },
    });
    if (error) throw error;
    if (!data?.ok) throw new Error(`sync_show failed: ${JSON.stringify(data)}`);
    return data as { ok: true; show_id: string; build: string };
  }

  async function getShowIdByTmdb(tmdbId: number) {
    const { data, error } = await supabase.from("shows").select("id").eq("tmdb_id", tmdbId).single();
    if (error) throw error;
    return data.id as string;
  }

  async function getShowServicesUS(showId: string): Promise<DbShowServiceRow[]> {
    const { data, error } = await supabase
      .from("show_services")
      .select("service_id,offer_type,provider_show_id,is_manual")
      .eq("show_id", showId)
      .eq("region", "US");

    if (error) throw error;

    return (data ?? []).map((r: any) => ({
      service_id: String(r.service_id),
      offer_type: (r.offer_type ?? "flatrate") as OfferType,
      provider_show_id: r.provider_show_id ? String(r.provider_show_id) : null,
      is_manual: !!r.is_manual,
    }));
  }

  function buildRecommendationsFromDb(userSvcs: UserServiceRow[], rows: DbShowServiceRow[]) {
    const providerIdByServiceId: Record<string, number> = {};
    const offerTypeByServiceId: Record<string, OfferType> = {};

    const flatrateIds = new Set(rows.filter((r) => r.offer_type === "flatrate").map((r) => r.service_id));
    const adsIds = new Set(rows.filter((r) => r.offer_type === "ads").map((r) => r.service_id));

    const recFlatrate = userSvcs.filter((s) => flatrateIds.has(s.id));
    const recAds = userSvcs.filter((s) => adsIds.has(s.id));

    const recommended = recFlatrate.length > 0 ? recFlatrate : recAds;

    for (const r of rows) {
      offerTypeByServiceId[r.service_id] = r.offer_type;
      const pid = r.provider_show_id ? Number(r.provider_show_id) : 0;
      if (pid && Number.isFinite(pid) && pid > 0) providerIdByServiceId[r.service_id] = pid;
    }

    return { recommended, providerIdByServiceId, offerTypeByServiceId };
  }

  const openPickerFor = async (item: TmdbSearchTvResult) => {
    if (servicesLoading) return;

    if (services.length === 0) {
      Alert.alert(
        t("addShow.noServicesTitle", { defaultValue: "No services selected" }),
        t("addShow.noServicesBody", { defaultValue: "Go to Services and select at least one streaming service first." })
      );
      return;
    }

    if (services.length === 1) {
      addShow(item, services[0], { isManual: false, showIdOverride: null });
      return;
    }

    try {
      setSyncing(true);

      const syncRes = await ensureSynced(item.id);
      const showId = syncRes?.show_id ? String(syncRes.show_id) : await getShowIdByTmdb(item.id);

      setPendingShowId(showId);

      const ss = await getShowServicesUS(showId);
      const rec = buildRecommendationsFromDb(services, ss);

      setProviderContext({
        providerIdByServiceId: rec.providerIdByServiceId,
        offerTypeByServiceId: rec.offerTypeByServiceId,
      });

      setRecommendedServices(rec.recommended);
      setPendingItem(item);

      setPickMode(rec.recommended.length > 0 ? "recommended" : "all");
      setPickerVisible(true);
    } catch (e: any) {
      if (__DEV__) console.log("[AddShow] openPickerFor DB provider error:", e?.message ?? e);

      setRecommendedServices([]);
      setProviderContext({ providerIdByServiceId: {}, offerTypeByServiceId: {} });
      setPendingItem(item);
      setPendingShowId(null);
      setPickMode("all");
      setPickerVisible(true);
    } finally {
      setSyncing(false);
    }
  };

  const addShow = async (item: TmdbSearchTvResult, chosenService: UserServiceRow, opts: AddOpts) => {
    if (syncing) return;

    const { data: sess, error: sessErr } = await supabase.auth.getSession();
    if (sessErr) return Alert.alert(t("addShow.authErrorTitle", { defaultValue: "Auth error" }), sessErr.message);

    const uid = sess.session?.user?.id;
    if (!uid) return Alert.alert(t("addShow.notSignedInTitle", { defaultValue: "Not signed in" }), t("addShow.notSignedInBody", { defaultValue: "Please sign in again." }));

    setSyncing(true);
    try {
      let showId = opts.showIdOverride ?? pendingShowId ?? null;

      if (!showId) {
        const syncRes = await ensureSynced(item.id);
        showId = String(syncRes.show_id);
      }

      const { error: upsertErr } = await supabase.from("user_shows").upsert(
        {
          user_id: uid,
          show_id: showId,
          poster_path: item.poster_path ?? null,
        },
        { onConflict: "user_id,show_id" }
      );
      if (upsertErr) throw upsertErr;

      const { data: updated, error: rpcErr } = await supabase.rpc("user_show_set_primary_service", {
        p_show_id: showId,
        p_service_id: chosenService.id,
      });
      if (rpcErr) throw rpcErr;
      if (!updated || updated !== 1) throw new Error(t("addShow.primaryServiceUpdateFailed", { defaultValue: "Primary service update failed (0 rows updated)." }));

      if (opts.isManual) {
        const tmdbProviderId = providerContext.providerIdByServiceId[chosenService.id] ?? null;
        const offerType = providerContext.offerTypeByServiceId[chosenService.id] ?? "flatrate";

        const showServiceRow: any = {
          show_id: showId,
          service_id: chosenService.id,
          provider_show_id: tmdbProviderId ? String(tmdbProviderId) : null,
          is_primary: false,
          is_manual: true,
          region: "US",
          offer_type: offerType,
        };

        const ins = await supabase
          .from("show_services")
          .upsert(showServiceRow, { onConflict: "show_id,service_id,region,offer_type" });

        if (ins.error) throw ins.error;
      }

      setQuery("");
      setResults([]);
      emit();

      Alert.alert(
        t("addShow.addedTitle", { defaultValue: "Added" }),
        t("addShow.addedBody", { name: item.name, defaultValue: `${item.name} was added.` })
      );
    } catch (e: any) {
      if (__DEV__) console.log("[AddShow] addShow error:", e?.message ?? e);
      Alert.alert(t("addShow.addFailedTitle", { defaultValue: "Add failed" }), e?.message ?? t("addShow.errorUnknown", { defaultValue: "Unknown error" }));
    } finally {
      setSyncing(false);
    }
  };

  const resultsEmptyState = useMemo(() => {
    const q = query.trim();
    if (loading) return null;

    const boxStyle = {
      padding: 14,
      borderWidth: 1,
      borderColor: THEME.borderSoft,
      borderRadius: THEME.r.md,
      backgroundColor: THEME.panel,
      ...THEME.shadow.card,
    } as const;

    if (!q) {
      return (
        <View style={boxStyle}>
          <Text style={{ fontWeight: "900", color: THEME.text }}>
            {t("addShow.empty.noResultsYetTitle", { defaultValue: "No results yet" })}
          </Text>
          <Text style={{ marginTop: 6, color: THEME.textMuted }}>
            {t("addShow.empty.noResultsYetBody", { defaultValue: "Try: The Bear, Severance, Reacher, True Detective" })}
          </Text>
        </View>
      );
    }

    if (q.length < 2) {
      return (
        <View style={boxStyle}>
          <Text style={{ fontWeight: "900", color: THEME.text }}>
            {t("addShow.empty.type2Title", { defaultValue: "Type at least 2 characters" })}
          </Text>
          <Text style={{ marginTop: 6, color: THEME.textMuted }}>
            {t("addShow.empty.type2Body", { defaultValue: "Example: “Severance”" })}
          </Text>
        </View>
      );
    }

    if (results.length === 0) {
      return (
        <View style={boxStyle}>
          <Text style={{ fontWeight: "900", color: THEME.text }}>
            {t("addShow.empty.noMatchesTitle", { defaultValue: "No matches" })}
          </Text>
          <Text style={{ marginTop: 6, color: THEME.textMuted }}>
            {t("addShow.empty.noMatchesBody", { defaultValue: "Try a different spelling." })}
          </Text>
        </View>
      );
    }

    return null;
  }, [query, loading, results.length, t]);

  // tighter buttons (top section)
  const glassBtn = {
    paddingVertical: 10,
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

  const pickerData = pickMode === "recommended" && recommendedServices.length > 0 ? recommendedServices : services;

  const pickerTitle =
    pickMode === "recommended" && recommendedServices.length > 0
      ? t("addShow.picker.recommendedTitle", { defaultValue: "Available on your services" })
      : t("addShow.picker.allTitle", { defaultValue: "Pick a service" });

  const showPickAnyway =
    pickMode === "recommended" && recommendedServices.length > 0 && services.length > recommendedServices.length;

  return (
    <Screen scroll>
      <ServicePicker
        visible={pickerVisible}
        services={pickerData}
        title={pickerTitle}
        onClose={() => {
          setPickerVisible(false);
          setPendingItem(null);
          setPendingShowId(null);
          setPickMode("recommended");
          setRecommendedServices([]);
          setProviderContext({ providerIdByServiceId: {}, offerTypeByServiceId: {} });
        }}
        onSelect={(svc) => {
          const item = pendingItem;
          const showId = pendingShowId;

          setPickerVisible(false);
          setPendingItem(null);
          setPendingShowId(null);

          if (!item) return;

          const isManual = pickMode === "all";
          addShow(item, svc as any, { isManual, showIdOverride: showId });
        }}
      />

      <Section
        title={t("addShow.section.title", { defaultValue: "Add a show" })}
        subtitle={t("addShow.section.subtitle", { defaultValue: "Search TMDB, then add it in one tap." })}
      >
        <View>
          <View
            style={{
              borderWidth: 1,
              borderColor: THEME.borderSoft,
              borderRadius: THEME.r.md,
              backgroundColor: THEME.panel,
              paddingHorizontal: 12,
              paddingVertical: 8,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              ...THEME.shadow.card,
            }}
          >
            <Ionicons name="search" size={18} color={THEME.textDim} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t("addShow.searchPlaceholder", { defaultValue: "Search TV (e.g. Severance)" })}
              placeholderTextColor={THEME.textDim}
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                flex: 1,
                fontSize: 16,
                color: THEME.text,
                paddingVertical: 2,
              }}
              returnKeyType="search"
              onSubmitEditing={doSearch}
            />
          </View>

          <Pressable
            onPress={doSearch}
            disabled={!canSearch}
            style={[primaryBtn, { marginTop: 10, opacity: canSearch ? 1 : 0.45 }]}
          >
            <Text style={{ fontWeight: "900", color: THEME.text }}>
              {loading
                ? t("addShow.searching", { defaultValue: "Searching…" })
                : syncing
                  ? t("addShow.working", { defaultValue: "Working…" })
                  : t("addShow.search", { defaultValue: "Search" })}
            </Text>
          </Pressable>

          <View style={{ marginTop: 10 }}>
            {servicesLoading ? (
              <Text style={{ color: THEME.textDim, fontSize: 12 }}>
                {t("addShow.services.loading", { defaultValue: "Loading your services…" })}
              </Text>
            ) : services.length === 0 ? (
              <Text style={{ color: THEME.textDim, fontSize: 12 }}>
                {t("addShow.services.noneSelected", {
                  defaultValue: "No services selected. Go to Services and pick at least one.",
                })}
              </Text>
            ) : services.length === 1 ? (
              <Text style={{ color: THEME.textDim, fontSize: 12 }}>
                {t("addShow.services.autoAssignPrefix", { defaultValue: "Auto-assigning service:" })}{" "}
                <Text style={{ color: THEME.text, fontWeight: "900" }}>{services[0].name}</Text>
              </Text>
            ) : (
              <Text style={{ color: THEME.textDim, fontSize: 12 }}>
                {t("addShow.services.multiHint", {
                  defaultValue: "Tap Add → we’ll recommend only matching US services (DB-truth).",
                })}
              </Text>
            )}
          </View>
        </View>
      </Section>

      <Section title={t("addShow.results.title", { defaultValue: "Results" })}>
        <Text style={{ color: THEME.textMuted, marginTop: 2 }}>
          {t("addShow.results.count", { count: results.length, defaultValue: `Results: ${results.length}` })}{" "}
          {loading ? t("addShow.results.loadingTag", { defaultValue: "(loading)" }) : ""}
        </Text>

        {loading ? (
          <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", gap: 10 }}>
            <ActivityIndicator />
            <Text style={{ fontWeight: "800", color: THEME.textMuted }}>
              {t("addShow.searching", { defaultValue: "Searching…" })}
            </Text>
          </View>
        ) : null}

        <View style={{ marginTop: 12 }}>
          {resultsEmptyState}

          {results.map((item) => {
            const poster = tmdbPosterUrl(item.poster_path, "w92");
            const tmdbId = item.id;

            const badges = badgesByTmdbId[tmdbId] ?? null;
            const isBadgeLoading = !!badgeLoading[tmdbId];
            const isBadgeFailed = !!badgeFailed[tmdbId];

            const yr = yearFromFirstAirDate(item.first_air_date);

            return (
              <View
                key={item.id}
                style={{
                  borderWidth: 1,
                  borderColor: THEME.borderSoft,
                  borderRadius: THEME.r.md,
                  padding: 10,
                  marginBottom: 10,
                  opacity: syncing || servicesLoading ? 0.6 : 1,
                  flexDirection: "row",
                  gap: 12,
                  backgroundColor: THEME.panel,
                  ...THEME.shadow.card,
                }}
              >
                {poster ? (
                  <Image
                    source={{ uri: poster }}
                    style={{
                      width: 52,
                      height: 78,
                      borderRadius: 10,
                      ...THEME.shadow.card,
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: 52,
                      height: 78,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: THEME.borderSoft,
                      backgroundColor: THEME.panelStrong,
                      opacity: 0.6,
                    }}
                  />
                )}

                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "900", fontSize: 16, color: THEME.text }} numberOfLines={2}>
                    {item.name}
                  </Text>

                  {yr ? (
                    <Text style={{ marginTop: 2, color: THEME.textMuted, fontWeight: "700" }}>{yr}</Text>
                  ) : null}

                  {isBadgeLoading ? (
                    <Text style={{ marginTop: 8, color: THEME.textDim, fontSize: 12 }}>
                      {t("addShow.badges.checking", { defaultValue: "Checking US streaming…" })}
                    </Text>
                  ) : badges && badges.length > 0 ? (
                    <BadgePillsCompact badges={badges} />
                  ) : isBadgeFailed ? (
                    <Text style={{ marginTop: 8, color: THEME.textDim, fontSize: 12 }}>
                      {t("addShow.badges.unavailable", { defaultValue: "Services unavailable right now." })}
                    </Text>
                  ) : badges && badges.length === 0 ? (
                    <Text
                      style={{
                        marginTop: 6,
                        color: THEME.textDim,
                        fontSize: 11,
                        opacity: 0.85,
                      }}
                    >
                      {t("addShow.badges.noUsData", { defaultValue: "No US streaming data (TMDB). Tap Add to sync." })}
                    </Text>
                  ) : (
                    <Text style={{ marginTop: 8, color: THEME.textDim, fontSize: 12 }}>
                      {t("addShow.badges.checking", { defaultValue: "Checking US streaming…" })}
                    </Text>
                  )}

                  <View
                    style={{
                      marginTop: 10,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "flex-end",
                    }}
                  >
                    <Pressable
                      onPress={() => openPickerFor(item)}
                      disabled={syncing || servicesLoading}
                      style={({ pressed }) => [
                        {
                          borderRadius: 999,
                          paddingVertical: 8,
                          paddingHorizontal: 14,
                          backgroundColor: THEME.accentSoft,
                          borderWidth: 1,
                          borderColor: THEME.accentSoft,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                        },
                        (syncing || servicesLoading) && { opacity: 0.6 },
                        pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                      ]}
                    >
                      <Ionicons name="add" size={16} color={THEME.accent} />
                      <Text style={{ fontWeight: "900", color: THEME.text }}>
                        {syncing ? t("addShow.adding", { defaultValue: "Adding…" }) : t("addShow.add", { defaultValue: "Add" })}
                      </Text>
                    </Pressable>
                  </View>

                  {servicesLoading ? (
                    <Text style={{ marginTop: 6, color: THEME.textDim, fontSize: 12 }}>
                      {t("addShow.services.loadingShort", { defaultValue: "Loading services…" })}
                    </Text>
                  ) : services.length === 0 ? (
                    <Text style={{ marginTop: 6, color: THEME.textDim, fontSize: 12 }}>
                      {t("addShow.services.selectFirst", { defaultValue: "Select services first (Services screen)." })}
                    </Text>
                  ) : services.length === 1 ? (
                    <Text style={{ marginTop: 6, color: THEME.textDim, fontSize: 12 }}>
                      {t("addShow.services.autoAssignInline", {
                        name: services[0].name,
                        defaultValue: `Auto-assigning ${services[0].name}.`,
                      })}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      </Section>

      {pickerVisible && showPickAnyway ? (
        <View style={{ paddingHorizontal: (THEME as any).pagePad ?? 18, paddingBottom: 18 }}>
          <Pressable onPress={() => setPickMode("all")} style={[glassBtn, { marginTop: 8 }]}>
            <Text style={{ fontWeight: "900", color: THEME.text }}>
              {t("addShow.picker.pickAnyway", { defaultValue: "Pick anyway (show all my services)" })}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </Screen>
  );
}