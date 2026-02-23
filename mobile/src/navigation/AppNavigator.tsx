// mobile/src/navigation/AppNavigator.tsx
import * as React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { Session } from "@supabase/supabase-js";

import WelcomeScreen from "../screens/WelcomeScreen";
import SignUpScreen from "../screens/SignUpScreen";
import SignInScreen from "../screens/SignInScreen";
import AppTabs from "./AppTabs";
import { THEME } from "../lib/theme";

export type RootStackParamList = {
  Welcome: undefined;
  SignUp: undefined;
  SignIn: undefined;
  App: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator({ session }: { session: Session | null }) {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          // Kill the white native header everywhere by default.
          headerShown: false,

          // Prevent white flash during transitions / overscroll.
          contentStyle: { backgroundColor: THEME.bgSolid },
        }}
      >
        {!session ? (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
            <Stack.Screen name="SignIn" component={SignInScreen} />
          </>
        ) : (
          // Tabs manage their own headers (or lack of).
          <Stack.Screen name="App" component={AppTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
