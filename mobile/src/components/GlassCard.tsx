import React from "react";
import { View, ViewStyle, StyleProp } from "react-native";
import { THEME } from "../lib/theme";

export function GlassCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          borderRadius: THEME.r.lg,
          padding: 14,
          backgroundColor: "rgba(20,20,28,0.72)",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.10)",
          ...THEME.shadow.card,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
