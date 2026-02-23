// mobile/src/components/EpisodeCard.tsx
import React, { useMemo } from "react";
import { View, Text, Pressable, Image, Alert, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { localFollowShow, localUnfollowShow } from "../lib/myShowsRepo";
import { THEME } from "../lib/theme";
import { openEpisodeLinks } from "../lib/openEpisode";

/**
 * Unified row type for screens + components.
 * Keep optional fields optional.
 */
export type EpisodeRow = {
  episode_id: string;
  user_id?: string;
  show_id?: string;

  show_title: string;
  episode_title?: string | null;

  season: number | null;
  episode: number | null;

  air_date_local: string; // YYYY-MM-DD
  air_date_utc?: string | null;
  drop_ts_local?: string | null;

  service_id: string | null;
  service_name: string | null;

  // IMPORTANT: this is the service homepage (svc.web_url)
  service_web_url?: string | null;

  // visuals (may be full URL or TMDB path like "/abc.jpg")
  poster_url?: string | null;
  logo_url?: string | null;

  // deep links
  roku_deep_link?: string | null; // optional (not used here yet)
  web_url?: string | null; // optional show page if available
  android_deep_link?: string | null;
  ios_deep_link?: string | null;

  // NEW: intent + store fallbacks
  android_intent_link?: string | null;
  android_play_store_url?: string | null;
  ios_app_store_url?: string | null;

  // optional template fallback
  show_url_template?: string | null;
  provider_show_id?: string | null;

  // optional runtime (enriched in screens)
  runtime?: number | null;
};

function episodeTitleWithFallback(r: EpisodeRow) {
  const t = r.episode_title?.trim();
  if (t) return t;
  if (r.season != null && r.episode != null) return `S${r.season}E${r.episode}`;
  return "Episode";
}

function formatLocalTime(ts: string) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function isMidnightUtc(ts: string) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return false;
  return d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0;
}

function todayLocalYMD() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function tomorrowLocalYMD() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function computeTimeChip(r: EpisodeRow): string | null {
  // 1) Prefer real, local drop timestamp
  if (r.drop_ts_local) {
    const t = formatLocalTime(r.drop_ts_local);
    if (t) return t;
  }

  // 2) If air_date_utc includes a real time (not 00:00Z), show it
  if (r.air_date_utc && !isMidnightUtc(r.air_date_utc)) {
    const t = formatLocalTime(r.air_date_utc);
    if (t) return t;
  }

  // 3) Final fallback: NEVER lie with a fake time.
  //    Show a semantic chip only when it’s relevant.
  const ymd = r.air_date_local;
  if (!ymd) return null;

  const today = todayLocalYMD();
  if (ymd === today) return "Tonight";

  const tomorrow = tomorrowLocalYMD();
  if (ymd === tomorrow) return "Tomorrow";

  return null;
}

/**
 * Accepts either:
 * - Full URL: https://...
 * - TMDB path: /abc123.jpg
 */
function normalizeTmdbImageUrl(
  u?: string | null,
  size: "w92" | "w154" | "w342" | "w500" | "original" = "w342"
) {
  if (!u) return null;
  const s = u.trim();
  if (!s) return null;

  if (s.startsWith("http://") || s.startsWith("https://")) return s;

  // TMDB path fallback
  if (s.startsWith("/")) return `https://image.tmdb.org/t/p/${size}${s}`;

  return null;
}

export function EpisodeCard(props: {
  row: EpisodeRow;
  busy?: boolean;

  // NOW OPTIONAL (default behavior: openEpisodeLinks(row))
  onOpen?: (row: EpisodeRow) => void;

  onWatched: (row: EpisodeRow) => void;

  isFollowing?: boolean;
  onFollowChanged?: () => void;
}) {
  const { row: r, busy = false, onOpen, onWatched, isFollowing, onFollowChanged } = props;

  const serviceLabel = r.service_name?.trim() || "Service";
  const titleLine = useMemo(() => episodeTitleWithFallback(r), [r]);

  // ✅ single source of truth for chip (no fake 7:00 PM)
  const timeChip = useMemo(() => computeTimeChip(r), [r]);

  const seasonEpisodeLabel =
    r.season != null && r.episode != null ? ` • S${r.season}E${r.episode}` : "";

  const openLabel = r.service_name?.trim() ? `Open in ${r.service_name.trim()}` : "Open";
  const canFollow = !!r.show_id;

  // ✅ normalize images so they work with either full URLs or TMDB paths
  const posterUri = useMemo(() => normalizeTmdbImageUrl(r.poster_url, "w342"), [r.poster_url]);
  const logoUri = useMemo(() => normalizeTmdbImageUrl(r.logo_url, "w92"), [r.logo_url]);

  async function follow() {
    if (!r.show_id) return;
    try {
      await localFollowShow({
        show_id: r.show_id,
        show_title: r.show_title,
        poster_url: r.poster_url ?? null,
      });
      onFollowChanged?.();
    } catch (e: any) {
      Alert.alert("Follow failed", e?.message ?? "Unknown error");
    }
  }

  async function unfollow() {
    if (!r.show_id) return;
    Alert.alert("Unfollow?", r.show_title, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unfollow",
        style: "destructive",
        onPress: async () => {
          try {
            await localUnfollowShow(r.show_id!);
            onFollowChanged?.();
          } catch (e: any) {
            Alert.alert("Unfollow failed", e?.message ?? "Unknown error");
          }
        },
      },
    ]);
  }

  async function handleOpen() {
    if (busy) return;

    // If screen wants to override open behavior, let it.
    if (onOpen) return onOpen(r);

    // Default: hardened opener with fallbacks.
    await openEpisodeLinks(
      {
        android_deep_link: r.android_deep_link,
        ios_deep_link: r.ios_deep_link,
        android_intent_link: r.android_intent_link,
        show_url_template: r.show_url_template,
        provider_show_id: r.provider_show_id,
        web_url: r.web_url,
        service_web_url: r.service_web_url,
        android_play_store_url: r.android_play_store_url,
        ios_app_store_url: r.ios_app_store_url,
      },
      {
        // For now: console telemetry (safe). Replace later with logOpenService(...)
        onResult: (res) => {
          console.log("[openEpisodeLinks]", {
            episode_id: r.episode_id,
            service_id: r.service_id,
            service_name: r.service_name,
            platform: Platform.OS,
            res,
          });
        },
      }
    );
  }

  const card = {
    backgroundColor: THEME.panel,
    borderWidth: 1,
    borderColor: THEME.borderSoft,
    borderRadius: THEME.r.md,
    padding: 12,
    ...THEME.shadow.card,
  } as const;

  const pill = {
    borderWidth: 1,
    borderColor: THEME.accentSoft,
    backgroundColor: THEME.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "flex-start" as const,
  };

  const btnBase = {
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.borderSoft,
    alignItems: "center" as const,
    backgroundColor: THEME.panelStrong,
  };

  const btnPrimary = {
    ...btnBase,
    borderColor: THEME.accentSoft,
    backgroundColor: THEME.accentSoft,
  };

  const titleStyle = { fontWeight: "900" as const, fontSize: 16, color: THEME.text };
  const subStyle = { marginTop: 4, color: THEME.textMuted };

  const iconColor = THEME.text;

  return (
    <View style={card}>
      <View style={{ flexDirection: "row", gap: 12 }}>
        {posterUri ? (
          <Image
            source={{ uri: posterUri }}
            style={{
              width: 54,
              height: 78,
              borderRadius: THEME.r.xs,
              backgroundColor: "rgba(255,255,255,0.05)",
            }}
            resizeMode="cover"
          />
        ) : null}

        <View style={{ flex: 1 }}>
          <Text style={titleStyle} numberOfLines={2}>
            {r.show_title}
          </Text>

          <Text style={subStyle} numberOfLines={2}>
            {titleLine}
          </Text>

          {timeChip ? (
            <View style={{ marginTop: 8 }}>
              <View style={pill}>
                <Text style={{ fontWeight: "900", fontSize: 12, color: THEME.text }}>{timeChip}</Text>
              </View>
            </View>
          ) : null}

          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 10, gap: 8 }}>
            {logoUri ? (
              <Image
                source={{ uri: logoUri }}
                style={{ width: 18, height: 18, borderRadius: 4 }}
                resizeMode="contain"
              />
            ) : null}

            <Text style={{ color: THEME.textDim }} numberOfLines={1}>
              {serviceLabel}
              {seasonEpisodeLabel}
            </Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={{ marginTop: 12, gap: 10 }}>
        {/* Primary: Open */}
        <Pressable
          onPress={handleOpen}
          disabled={busy}
          style={[
            btnPrimary,
            {
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              gap: 8,
              opacity: busy ? 0.65 : 1,
            },
          ]}
        >
          <Ionicons name="play" size={16} color={iconColor} />
          <Text style={{ fontWeight: "900", color: THEME.text }}>{busy ? "Working…" : openLabel}</Text>
        </Pressable>

        {/* Secondary row: Follow + Watched */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          {canFollow ? (
            isFollowing ? (
              <Pressable
                onPress={unfollow}
                disabled={busy}
                style={[
                  btnBase,
                  {
                    flex: 1,
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 8,
                    opacity: busy ? 0.55 : 1,
                  },
                ]}
              >
                <Ionicons name="checkmark" size={16} color={iconColor} />
                <Text style={{ fontWeight: "900", color: THEME.text }}>{busy ? "Working…" : "Following"}</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={follow}
                disabled={busy}
                style={[
                  btnBase,
                  {
                    flex: 1,
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 8,
                    opacity: busy ? 0.55 : 1,
                  },
                ]}
              >
                <Ionicons name="add" size={16} color={iconColor} />
                <Text style={{ fontWeight: "900", color: THEME.text }}>{busy ? "Working…" : "Follow"}</Text>
              </Pressable>
            )
          ) : (
            <View style={{ flex: 1 }} />
          )}

          <Pressable
            onPress={() => onWatched(r)}
            disabled={busy}
            style={[
              btnBase,
              {
                flex: 1,
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                gap: 8,
                opacity: busy ? 0.55 : 1,
              },
            ]}
          >
            <Ionicons name="eye" size={16} color={iconColor} />
            <Text style={{ fontWeight: "900", color: THEME.text }}>{busy ? "Working…" : "Watched"}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
