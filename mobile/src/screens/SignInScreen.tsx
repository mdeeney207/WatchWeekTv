// mobile/src/screens/SignIn.tsx
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";

import { supabase } from "../lib/supabase";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { Screen } from "../components/Screen";
import { THEME } from "../lib/theme";

type Props = NativeStackScreenProps<RootStackParamList, "SignIn">;

function BackLink({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      style={({ pressed }) => ({
        alignSelf: "flex-start",
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: THEME.borderSoft,
        backgroundColor: "rgba(255,255,255,0.06)",
        opacity: pressed ? 0.9 : 1,
        transform: [{ scale: pressed ? 0.99 : 1 }],
      })}
    >
      <Text style={{ color: THEME.textDim, fontWeight: "800", fontSize: 12 }}>
        ← Back
      </Text>
    </Pressable>
  );
}

function PrimaryButton({
  title,
  onPress,
  disabled,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!!disabled}
      style={({ pressed }) => ({
        marginTop: 14,
        paddingVertical: 14,
        borderRadius: THEME.r.md,
        alignItems: "center",
        backgroundColor: THEME.text,
        opacity: disabled ? 0.6 : pressed ? 0.92 : 1,
        transform: [{ scale: pressed ? 0.99 : 1 }],
      })}
    >
      <Text style={{ color: THEME.bgSolid, fontWeight: "900", fontSize: 15 }}>
        {title}
      </Text>
    </Pressable>
  );
}

export default function SignInScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  const emailTrimmed = useMemo(() => email.trim(), [email]);

  const onSignIn = async () => {
    if (!emailTrimmed || !password) {
      return Alert.alert("Missing info", "Enter email and password.");
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: emailTrimmed,
        password,
      });
      if (error) throw error;
      // AuthGate will redirect to AppTabs on auth change.
    } catch (e: any) {
      Alert.alert("Sign in failed", e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const inputBase = {
    color: THEME.text as any,
    borderRadius: THEME.r.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
  } as const;

  return (
    <Screen padded={false}>
      <View style={{ flex: 1, backgroundColor: THEME.bgSolid }}>
        {/* Cinematic “blooms” (no libs) */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: -140,
            left: -80,
            width: 340,
            height: 340,
            borderRadius: 340,
            backgroundColor: "rgba(120, 80, 255, 0.22)",
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 50,
            right: -120,
            width: 360,
            height: 360,
            borderRadius: 360,
            backgroundColor: "rgba(0, 255, 200, 0.12)",
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            bottom: -240,
            left: -160,
            width: 540,
            height: 540,
            borderRadius: 540,
            backgroundColor: "rgba(255,255,255,0.06)",
          }}
        />

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <ScrollView
              contentContainerStyle={{
                flexGrow: 1,
                paddingHorizontal: THEME.pagePad ?? 18,
                paddingTop: 14,
                paddingBottom: 22,
                justifyContent: "center",
              }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={{ marginBottom: 14 }}>
                <BackLink onPress={() => navigation.goBack()} />
              </View>

              {/* Header */}
              <View style={{ marginBottom: 14 }}>
                <Text
                  style={{
                    color: THEME.text,
                    fontSize: 30,
                    fontWeight: "900",
                    letterSpacing: -0.4,
                  }}
                >
                  Sign in
                </Text>
                <Text
                  style={{
                    color: THEME.textDim,
                    marginTop: 8,
                    fontSize: 15,
                    lineHeight: 20,
                    maxWidth: 360,
                  }}
                >
                  Welcome back. Let’s get you into your calendar.
                </Text>
              </View>

              {/* Glass card */}
              <View
                style={{
                  borderRadius: THEME.r.lg,
                  padding: 16,
                  backgroundColor: "rgba(20,20,28,0.72)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.10)",
                  ...THEME.shadow.card,
                  overflow: "hidden",
                }}
              >
                {/* subtle top highlight */}
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 1,
                    backgroundColor: "rgba(255,255,255,0.18)",
                  }}
                />

                {/* Email */}
                <Text
                  style={{
                    color: THEME.textDim,
                    fontSize: 12,
                    fontWeight: "800",
                    marginBottom: 6,
                  }}
                >
                  Email
                </Text>
                <TextInput
                  placeholder="you@email.com"
                  placeholderTextColor={THEME.textDim}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  returnKeyType="next"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  style={{
                    ...inputBase,
                    borderColor: emailFocused
                      ? "rgba(0,255,200,0.45)"
                      : "rgba(255,255,255,0.12)",
                  }}
                />

                <View style={{ height: 12 }} />

                {/* Password */}
                <Text
                  style={{
                    color: THEME.textDim,
                    fontSize: 12,
                    fontWeight: "800",
                    marginBottom: 6,
                  }}
                >
                  Password
                </Text>
                <TextInput
                  placeholder="••••••••"
                  placeholderTextColor={THEME.textDim}
                  secureTextEntry
                  returnKeyType="done"
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setPassFocused(true)}
                  onBlur={() => setPassFocused(false)}
                  style={{
                    ...inputBase,
                    borderColor: passFocused
                      ? "rgba(120,80,255,0.55)"
                      : "rgba(255,255,255,0.12)",
                  }}
                />

                <PrimaryButton
                  title={loading ? "Signing in..." : "Sign in"}
                  onPress={onSignIn}
                  disabled={loading}
                />

                <Pressable
                  onPress={() => navigation.replace("SignUp")}
                  style={({ pressed }) => ({
                    paddingVertical: 12,
                    opacity: pressed ? 0.9 : 1,
                  })}
                  hitSlop={10}
                >
                  <Text
                    style={{
                      textAlign: "center",
                      color: THEME.textDim,
                      fontWeight: "800",
                    }}
                  >
                    New here?{" "}
                    <Text
                      style={{
                        color: THEME.text,
                        textDecorationLine: "underline",
                        fontWeight: "900",
                      }}
                    >
                      Create account
                    </Text>
                  </Text>
                </Pressable>

                <Text
                  style={{
                    color: THEME.textDim,
                    fontSize: 12,
                    marginTop: 6,
                    lineHeight: 16,
                    textAlign: "center",
                  }}
                >
                  Sign in uses your WatchWeek account on this device.
                </Text>
              </View>

              <View style={{ height: 18 }} />
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </View>
    </Screen>
  );
}
