// mobile/src/screens/Welcome.tsx
import React from "react";
import { View, Text, Pressable } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { Screen } from "../components/Screen";
import { THEME } from "../lib/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Welcome">;

function PrimaryButton({
  title,
  onPress,
}: {
  title: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingVertical: 14,
        borderRadius: THEME.r.md,
        alignItems: "center",
        backgroundColor: THEME.text, // intentional "bright" CTA
        opacity: pressed ? 0.92 : 1,
        transform: [{ scale: pressed ? 0.99 : 1 }],
      })}
    >
      <Text style={{ color: THEME.bgSolid, fontWeight: "900", fontSize: 15 }}>
        {title}
      </Text>
    </Pressable>
  );
}

function SecondaryButton({
  title,
  onPress,
}: {
  title: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        marginTop: 12,
        paddingVertical: 14,
        borderRadius: THEME.r.md,
        alignItems: "center",
        borderWidth: 1,
        borderColor: THEME.borderSoft,
        backgroundColor: "rgba(255,255,255,0.06)", // glassy
        opacity: pressed ? 0.92 : 1,
        transform: [{ scale: pressed ? 0.99 : 1 }],
      })}
    >
      <Text style={{ color: THEME.text, fontWeight: "900", fontSize: 15 }}>
        {title}
      </Text>
    </Pressable>
  );
}

export default function WelcomeScreen({ navigation }: Props) {
  return (
    <Screen padded={false}>
      <View style={{ flex: 1, backgroundColor: THEME.bgSolid }}>
        {/* Cinematic layered “gradient” without libs */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: -140,
            left: -80,
            width: 340,
            height: 340,
            borderRadius: 340,
            backgroundColor: "rgba(120, 80, 255, 0.22)", // purple bloom
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 40,
            right: -120,
            width: 360,
            height: 360,
            borderRadius: 360,
            backgroundColor: "rgba(0, 255, 200, 0.12)", // emerald bloom
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            bottom: -220,
            left: -140,
            width: 520,
            height: 520,
            borderRadius: 520,
            backgroundColor: "rgba(255,255,255,0.06)", // soft lift
          }}
        />

        {/* Content */}
        <View
          style={{
            flex: 1,
            paddingHorizontal: THEME.pagePad ?? 18,
            justifyContent: "center",
          }}
        >
          {/* Brand block */}
          <View style={{ marginBottom: 18 }}>
            <Text
              style={{
                color: THEME.text,
                fontSize: 40,
                fontWeight: "900",
                letterSpacing: -0.6,
              }}
            >
              WatchWeek
            </Text>

            <Text
              style={{
                color: THEME.textDim,
                marginTop: 8,
                fontSize: 15,
                lineHeight: 20,
                maxWidth: 340,
              }}
            >
              Your weekly drop calendar — across every streaming service.
            </Text>

            {/* Micro “badge” line */}
            <View
              style={{
                marginTop: 14,
                alignSelf: "flex-start",
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: 999,
                backgroundColor: "rgba(255,255,255,0.06)",
                borderWidth: 1,
                borderColor: THEME.borderSoft,
              }}
            >
              <Text style={{ color: THEME.textDim, fontSize: 12 }}>
                Never miss a new episode.
              </Text>
            </View>
          </View>

          {/* Glass card */}
          <View
            style={{
              borderRadius: THEME.r.lg,
              padding: 16,
              backgroundColor: "rgba(20,20,28,0.72)", // glass base
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

            <Text
              style={{
                color: THEME.text,
                fontSize: 16,
                fontWeight: "800",
                marginBottom: 10,
              }}
            >
              Get started
            </Text>

            <PrimaryButton
              title="Create account"
              onPress={() => navigation.navigate("SignUp")}
            />
            <SecondaryButton
              title="Sign in"
              onPress={() => navigation.navigate("SignIn")}
            />

            <Text
              style={{
                color: THEME.textDim,
                fontSize: 12,
                marginTop: 14,
                lineHeight: 16,
              }}
            >
              No spam. No nonsense. Just the shows you follow.
            </Text>
          </View>

          {/* Footer spacing */}
          <View style={{ height: 28 }} />
        </View>
      </View>
    </Screen>
  );
}
