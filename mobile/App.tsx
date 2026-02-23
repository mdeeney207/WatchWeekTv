// mobile/App.tsx
import React, { useEffect } from "react";
import { View } from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { RefreshBusProvider } from "./src/context/RefreshBus";
import { THEME } from "./src/lib/theme";

import AuthGate from "./src/AuthGate";
import AppTabs from "./src/navigation/AppTabs";

import { navigationRef } from "./src/navigation/navigationRef";
import { registerNotificationTapListeners } from "./src/lib/notificationRouter";

// ✅ i18n init (must run before any screens render)
import { initI18n } from "./src/i18n";
initI18n();

export type RootStackParamList = {
  AuthGate: undefined;
  AppTabs: undefined;
};

const Root = createNativeStackNavigator<RootStackParamList>();

const NavTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: "transparent", // stop nav from painting white
  },
};

export default function App() {
  useEffect(() => {
    const unregister = registerNotificationTapListeners({
      navigateToEpisode: (episodeId) => {
        if (!navigationRef.isReady()) return;

        // ✅ Correct nested navigation into tab route
        navigationRef.navigate(
          "AppTabs" as never,
          {
            screen: "Tonight",
            params: { focusEpisodeId: episodeId },
          } as never
        );
      },
    });
    return unregister;
  }, []);

  return (
    <SafeAreaProvider>
      <RefreshBusProvider>
        <View style={{ flex: 1, backgroundColor: THEME.bgSolid }}>
          <NavigationContainer ref={navigationRef} theme={NavTheme}>
            <Root.Navigator screenOptions={{ headerShown: false }}>
              <Root.Screen name="AuthGate" component={AuthGate} />
              <Root.Screen name="AppTabs" component={AppTabs} />
            </Root.Navigator>
          </NavigationContainer>
        </View>
      </RefreshBusProvider>
    </SafeAreaProvider>
  );
}