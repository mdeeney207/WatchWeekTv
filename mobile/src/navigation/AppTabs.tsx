// src/navigation/AppTabs.tsx
import React from "react";
import { Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { THEME } from "../lib/theme";

import WeekScreen from "../screens/WeekScreen";
import TonightMinimalScreen from "../screens/TonightMinimalScreen";
import ServicesStack from "./ServicesStack";
import SettingsScreen from "../screens/SettingsScreen";

export type AppTabParamList = {
  Week: undefined;
  Tonight: { focusEpisodeId?: string } | undefined;
  ServicesTab: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<AppTabParamList>();

export default function AppTabs() {
  return (
    <Tab.Navigator
      sceneContainerStyle={{ backgroundColor: "transparent" }}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,

        tabBarActiveTintColor: THEME.accent,
        tabBarInactiveTintColor: THEME.textDim,
        tabBarStyle: {
          backgroundColor: THEME.panel,
          borderTopColor: THEME.borderSoft,
          borderTopWidth: 1,
          height: Platform.select({ ios: 88, android: 72, default: 72 }),
          paddingTop: 8,
          paddingBottom: Platform.select({ ios: 26, android: 10, default: 10 }),
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "800" as any,
          letterSpacing: 0.2,
        },

        tabBarIcon: ({ focused, color, size }) => {
          const map: Record<string, keyof typeof Ionicons.glyphMap> = {
            Week: focused ? "calendar" : "calendar-outline",
            Tonight: focused ? "moon" : "moon-outline",
            ServicesTab: focused ? "tv" : "tv-outline",
            Settings: focused ? "settings" : "settings-outline",
          };
          return (
            <Ionicons
              name={map[route.name] ?? "ellipse-outline"}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Week" component={WeekScreen} options={{ title: "This Week" }} />
      <Tab.Screen name="Tonight" component={TonightMinimalScreen} options={{ title: "Tonight" }} />
      <Tab.Screen name="ServicesTab" component={ServicesStack} options={{ title: "Services" }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: "Settings" }} />
    </Tab.Navigator>
  );
}
