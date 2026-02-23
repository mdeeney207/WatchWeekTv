import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { THEME } from "../lib/theme";

type Props = {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  style?: ViewStyle;
};

export function Section({ title, subtitle, children, style }: Props) {
  return (
    <View style={[styles.card, style]}>
      {(title || subtitle) && (
        <View style={styles.header}>
          {!!title && <Text style={styles.title}>{title}</Text>}
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.panel,
    borderColor: THEME.borderSoft,
    borderWidth: 1,
    borderRadius: THEME.r.md,
    padding: THEME.cardPad,
    marginBottom: 14,
    ...THEME.shadow.card,
  },
  header: { marginBottom: 10 },
  title: {
    color: THEME.text,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  subtitle: {
    color: THEME.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
});
