import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { THEME } from "../lib/theme";

type Props = {
  title: string;
  subtitle?: string;
};

export function EmptyState({ title, subtitle }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.dotRow}>
        <View style={[styles.dot, { opacity: 0.25 }]} />
        <View style={[styles.dot, { opacity: 0.5 }]} />
        <View style={[styles.dot, { opacity: 0.85 }]} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 22,
    padding: 16,
    borderRadius: THEME.radius,
    backgroundColor: THEME.panel,
    borderWidth: 1,
    borderColor: THEME.panelBorder,
  },
  dotRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: THEME.accent,
  },
  title: {
    color: THEME.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    color: THEME.muted,
    fontSize: 13,
    lineHeight: 18,
  },
});
