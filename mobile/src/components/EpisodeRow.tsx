// mobile/src/components/EpisodeRow.tsx
import React, { useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import { THEME } from "../lib/theme";

type Props = {
  row: any;
  busy?: boolean;
  onOpen?: (row: any) => void;
  onWatched?: (row: any) => void;

  // optional props used by Tonight / other patterns
  isFollowing?: boolean;

  // make this tolerant: callers may pass args; we ignore safely
  onFollowChanged?: (...args: any[]) => void;

  density?: "tight" | "normal";
};

function formatRuntime(runtime?: number | null) {
  if (runtime == null) return "TBD";
  const n = Number(runtime);
  if (!Number.isFinite(n) || n <= 0) return "TBD";

  const mins = Math.round(n);
  const h = Math.floor(mins / 60);
  const m = mins % 60;

  if (h <= 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function EpisodeRow({
  row,
  busy,
  onOpen,
  onWatched,
  isFollowing,
  onFollowChanged,
  density = "normal",
}: Props) {
  const showTitle = String(row?.show_title ?? "").trim() || "Unknown show";
  const epTitle = String(row?.episode_title ?? "").trim() || "Episode";
  const season = row?.season ?? "?";
  const episode = row?.episode ?? "?";
  const serviceName = String(row?.service_name ?? "").trim();

  const runtimeLabel = useMemo(
    () => formatRuntime(row?.runtime ?? null),
    [row?.runtime]
  );

  const disabled = !!busy;
  const pad = density === "tight" ? 10 : 12;

  return (
    <View
      style={{
        backgroundColor: THEME.panel,
        borderRadius: THEME.r?.lg ?? 14,
        padding: pad,
        borderWidth: 1,
        borderColor: THEME.borderSoft,
        ...(THEME.shadow?.card ?? {}), // ✅ SAFE
      }}
    >
      <Text
        style={{ fontWeight: "900", color: THEME.text, fontSize: 15 }}
        numberOfLines={1}
      >
        {showTitle}
      </Text>

      <Text style={{ color: THEME.textMuted, marginTop: 2 }} numberOfLines={1}>
        S{season}E{episode} — {epTitle}
      </Text>

      {!!serviceName && (
        <Text
          style={{
            color: THEME.textMuted,
            marginTop: 4,
            fontWeight: "800",
            fontSize: 12,
          }}
          numberOfLines={1}
        >
          {serviceName}
        </Text>
      )}

      <Text style={{ marginTop: 6, fontWeight: "800", color: THEME.text }}>
        Runtime: {runtimeLabel}
      </Text>

      {typeof isFollowing === "boolean" && (
        <Text
          style={{
            marginTop: 6,
            color: THEME.textDim,
            fontWeight: "800",
            fontSize: 12,
          }}
        >
          {isFollowing ? "Following" : "Not following"}
        </Text>
      )}

      <View style={{ flexDirection: "row", marginTop: 10, gap: 10 }}>
        <Pressable
          disabled={disabled}
          onPress={() => onOpen?.(row)}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 14,
            backgroundColor: disabled ? THEME.accentSoft : THEME.accent,
            borderRadius: THEME.r?.sm ?? 10,
            opacity: disabled ? 0.7 : 1,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "900" }}>
            {disabled ? "..." : "Open"}
          </Text>
        </Pressable>

        <Pressable
          disabled={disabled}
          onPress={() => onWatched?.(row)}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 14,
            backgroundColor: "transparent",
            borderRadius: THEME.r?.sm ?? 10,
            borderWidth: 1,
            borderColor: THEME.borderSoft,
            opacity: disabled ? 0.7 : 1,
          }}
        >
          <Text style={{ color: THEME.text, fontWeight: "900" }}>
            {disabled ? "..." : "Watched"}
          </Text>
        </Pressable>

        {/* keep prop accepted; safe no-op */}
        {onFollowChanged ? null : null}
      </View>
    </View>
  );
}
