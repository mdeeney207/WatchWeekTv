// src/AuthGate.tsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, ActivityIndicator } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";

import { supabase } from "./lib/supabase";
import { registerForPushAndSaveToken } from "./lib/push";

import WelcomeScreen from "./screens/WelcomeScreen";
import SignInScreen from "./screens/SignInScreen";
import SignUpScreen from "./screens/SignUpScreen";

const Stack = createNativeStackNavigator();

export default function AuthGate() {
  const navigation = useNavigation<any>();

  const [booting, setBooting] = useState(true);
  const [session, setSession] = useState<any>(null);

  // Prevent duplicate registration spam on boot + auth change
  const pushRegisteredForUser = useRef<string | null>(null);

  const maybeRegisterPush = useCallback((s: any) => {
    const userId = s?.user?.id ?? null;
    if (!userId) return;
    if (pushRegisteredForUser.current === userId) return;

    pushRegisteredForUser.current = userId;

    registerForPushAndSaveToken()
      .then((t) => console.log("[push] register done, token:", t))
      .catch((e) => console.log("[push] register threw:", e?.message ?? e));
  }, []);

  useEffect(() => {
    let mounted = true;

    // 1) initial session load
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) console.log("[auth] getSession error:", error.message);

        const s = data.session;
        setSession(s);
        setBooting(false);

        // Only navigate when authenticated
        if (s) {
          maybeRegisterPush(s);
          // guard in case nav isn't ready (rare but safe)
          try {
            navigation.replace("AppTabs");
          } catch (e: any) {
            console.log("[auth] navigation.replace failed:", e?.message ?? e);
          }
        }
      })
      .catch((e) => {
        if (!mounted) return;
        console.log("[auth] getSession threw:", e?.message ?? e);
        setSession(null);
        setBooting(false);
      });

    // 2) live auth changes
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);

      if (s) {
        maybeRegisterPush(s);
        try {
          navigation.replace("AppTabs");
        } catch (e: any) {
          console.log("[auth] navigation.replace failed:", e?.message ?? e);
        }
      } else {
        // logged out: just show auth stack again
        pushRegisteredForUser.current = null;
        // IMPORTANT: do NOT navigate/replace here
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [navigation, maybeRegisterPush]);

  if (booting) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  // If authenticated, we already navigated to AppTabs, render nothing here.
  if (session) return null;

  // Otherwise: render auth stack (this is the "sign in options")
  return (
    <Stack.Navigator screenOptions={{ headerBackTitleVisible: false }}>
      <Stack.Screen
        name="Welcome"
        component={WelcomeScreen}
        options={{ title: "WatchWeek" }}
      />
      <Stack.Screen
        name="SignIn"
        component={SignInScreen}
        options={{ title: "Sign in" }}
      />
      <Stack.Screen
        name="SignUp"
        component={SignUpScreen}
        options={{ title: "Create account" }}
      />
    </Stack.Navigator>
  );
}
