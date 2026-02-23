import React, { useMemo, useRef } from "react";
import {
  Pressable,
  Text,
  View,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  TextStyle,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { THEME } from "../lib/theme";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "lg";

type Props = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;

  variant?: Variant;
  size?: Size;

  iconLeft?: keyof typeof Ionicons.glyphMap;
  iconRight?: keyof typeof Ionicons.glyphMap;

  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

function pickColors(variant: Variant) {
  switch (variant) {
    case "primary":
      return {
        bg: THEME.text, // bright button
        border: THEME.text,
        text: THEME.bgSolid,
      };
    case "secondary":
      return {
        bg: "rgba(255,255,255,0.06)",
        border: THEME.borderSoft,
        text: THEME.text,
      };
    case "ghost":
      return {
        bg: "transparent",
        border: "rgba(255,255,255,0.10)",
        text: THEME.text,
      };
    case "danger":
      return {
        bg: "rgba(239,68,68,0.12)",
        border: "rgba(239,68,68,0.25)",
        text: THEME.danger,
      };
  }
}

export function Button({
  label,
  onPress,
  disabled,
  loading,
  variant = "secondary",
  size = "md",
  iconLeft,
  iconRight,
  style,
  textStyle,
}: Props) {
  const colors = useMemo(() => pickColors(variant), [variant]);

  const scale = useRef(new Animated.Value(1)).current;
  const isDisabled = !!disabled || !!loading || !onPress;

  const padY = size === "lg" ? 14 : 12;
  const fontSize = size === "lg" ? 14 : 13;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      onPressIn={() => {
        Animated.spring(scale, { toValue: 0.985, useNativeDriver: true }).start();
      }}
      onPressOut={() => {
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
      }}
      style={({ pressed }) => [
        {
          opacity: isDisabled ? 0.6 : pressed ? 0.96 : 1,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          {
            transform: [{ scale }],
            paddingVertical: padY,
            paddingHorizontal: 14,
            borderRadius: THEME.r.md,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.bg,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 10,
            ...THEME.shadow.card,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator />
        ) : (
          <>
            {iconLeft ? <Ionicons name={iconLeft as any} size={16} color={colors.text} /> : null}
            <Text
              style={[
                {
                  fontWeight: "900",
                  color: colors.text,
                  fontSize,
                },
                textStyle,
              ]}
            >
              {label}
            </Text>
            {iconRight ? <Ionicons name={iconRight as any} size={16} color={colors.text} /> : null}
          </>
        )}
      </Animated.View>
    </Pressable>
  );
}
