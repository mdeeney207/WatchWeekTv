import React from "react";
import { ScrollView, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { THEME } from "../lib/theme";

type Props = {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean; // default true
  style?: ViewStyle;
  contentStyle?: ViewStyle; // for scroll container
};

export function Screen({ children, scroll, padded = true, style, contentStyle }: Props) {
  const insets = useSafeAreaInsets();

  const base: ViewStyle = {
    flex: 1,
    backgroundColor: "transparent",
    paddingTop: insets.top + 10,
    paddingBottom: insets.bottom + 18,
    paddingHorizontal: padded ? THEME.pagePad ?? 18 : 0,
  };

  if (scroll) {
    return (
      <ScrollView
        style={[base, style]}
        contentContainerStyle={[{ paddingBottom: insets.bottom + 24 }, contentStyle]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    );
  }

  return <View style={[base, style]}>{children}</View>;
}
