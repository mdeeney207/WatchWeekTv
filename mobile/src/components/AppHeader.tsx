// mobile/src/components/AppHeader.tsx
import React from "react";
import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { THEME } from "../lib/theme";

type Props = {
  title: string;
  subtitle?: string | null;
  leftLabel?: string; // e.g. "Back"
  onLeftPress?: (() => void) | null;
  rightLabel?: string; // e.g. "Refresh"
  onRightPress?: (() => void) | null;
};

export function AppHeader({
  title,
  subtitle,
  leftLabel,
  onLeftPress,
  rightLabel,
  onRightPress,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        paddingTop: insets.top + 10,
        paddingBottom: 10,
        paddingHorizontal: THEME.pagePad ?? 18,
        backgroundColor: THEME.bgSolid, // critical: kills white bleed
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10 }}>
          {!!onLeftPress && (
            <Pressable
              onPress={onLeftPress}
              hitSlop={10}
              style={({ pressed }) => ({
                paddingVertical: 8,
                paddingHorizontal: 10,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: THEME.borderSoft,
                backgroundColor: "rgba(255,255,255,0.06)",
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.99 : 1 }],
              })}
            >
              <Text style={{ color: THEME.textDim, fontWeight: "900", fontSize: 12 }}>
                {leftLabel ?? "Back"}
              </Text>
            </Pressable>
          )}

          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: THEME.text,
                fontSize: 22,
                fontWeight: "900",
                letterSpacing: -0.3,
              }}
              numberOfLines={1}
            >
              {title}
            </Text>
            {!!subtitle && (
              <Text
                style={{
                  color: THEME.textDim,
                  marginTop: 2,
                  fontSize: 13,
                  lineHeight: 18,
                }}
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            )}
          </View>
        </View>

        {!!onRightPress && (
          <Pressable
            onPress={onRightPress}
            hitSlop={10}
            style={({ pressed }) => ({
              marginLeft: 10,
              paddingVertical: 8,
              paddingHorizontal: 10,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: THEME.borderSoft,
              backgroundColor: "rgba(255,255,255,0.06)",
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.99 : 1 }],
            })}
          >
            <Text style={{ color: THEME.text, fontWeight: "900", fontSize: 12 }}>
              {rightLabel ?? "Action"}
            </Text>
          </Pressable>
        )}
      </View>

      {/* subtle divider */}
      <View
        style={{
          marginTop: 10,
          height: 1,
          backgroundColor: "rgba(255,255,255,0.08)",
        }}
      />
    </View>
  );
}
