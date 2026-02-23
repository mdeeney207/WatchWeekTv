import React from "react";
import { View, StyleSheet } from "react-native";
import { THEME } from "../lib/theme";

type Props = {
  children?: React.ReactNode;
};

/**
 * If expo-linear-gradient is installed+linked in the current runtime,
 * we use it. Otherwise we fall back to a solid background + overlay
 * to keep the app stable on any device.
 */
export function GradientBackground({ children }: Props) {
  let LinearGradient: any = null;
  try {
    // dynamic require so bundler doesn't hard-crash when module isn't present
    LinearGradient = require("expo-linear-gradient").LinearGradient;
  } catch {
    LinearGradient = null;
  }

  if (LinearGradient) {
    return (
      <LinearGradient
        colors={THEME.bgGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.fill}
      >
        {children}
      </LinearGradient>
    );
  }

  // Fallback: solid base + soft overlays (still looks premium)
  return (
    <View style={[styles.fill, { backgroundColor: THEME.bgSolid }]}>
      <View style={styles.overlayA} pointerEvents="none" />
      <View style={styles.overlayB} pointerEvents="none" />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  overlayA: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.35,
    transform: [{ scale: 1.1 }],
  },
  overlayB: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.18,
    transform: [{ scale: 1.25 }],
  },
});
