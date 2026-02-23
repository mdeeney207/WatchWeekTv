import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { THEME } from "../lib/theme";

type Props = {
  visible: boolean;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onHide?: () => void;
};

export function Toast({ visible, message, actionLabel, onAction, onHide }: Props) {
  const slide = useRef(new Animated.Value(40)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      Animated.parallel([
        Animated.timing(fade, { toValue: 0, duration: 140, useNativeDriver: true }),
        Animated.timing(slide, { toValue: 40, duration: 140, useNativeDriver: true }),
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [visible, fade, slide]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          opacity: fade,
          transform: [{ translateY: slide }],
        },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.toast}>
        <View style={styles.bar} />
        <Text style={styles.text} numberOfLines={2}>
          {message}
        </Text>

        {!!actionLabel && !!onAction && (
          <Pressable
            onPress={onAction}
            style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.actionText}>{actionLabel}</Text>
          </Pressable>
        )}

        <Pressable
          onPress={onHide}
          style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.75 }]}
          hitSlop={10}
        >
          <Text style={styles.closeText}>×</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 16,
    paddingHorizontal: 18,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: THEME.r.sm,
    borderWidth: 1,
    borderColor: THEME.borderSoft,
    backgroundColor: THEME.panel,
    ...THEME.shadow.card,
  },
  bar: {
    width: 6,
    height: 18,
    borderRadius: 99,
    backgroundColor: THEME.accent,
    opacity: 0.95,
  },
  text: {
    flex: 1,
    color: THEME.text,
    fontSize: 13,
    fontWeight: "800",
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: THEME.accentSoft,
    backgroundColor: "transparent",
  },
  actionText: {
    color: THEME.text,
    fontWeight: "900",
    fontSize: 12,
  },
  closeBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
  },
  closeText: {
    color: THEME.textMuted,
    fontSize: 22,
    fontWeight: "900",
    marginTop: -2,
  },
});
