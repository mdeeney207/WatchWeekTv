// src/lib/push.ts
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { supabase } from "./supabase";

Notifications.setNotificationHandler({
  handleNotification: async (_notification: Notifications.Notification) => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function isExpoPushToken(token: string) {
  return (
    token.startsWith("ExponentPushToken[") ||
    token.startsWith("ExpoPushToken[")
  );
}

function getProjectId(): string | undefined {
  const fromEasConfig = (Constants as any)?.easConfig?.projectId;
  const fromExtra = (Constants as any)?.expoConfig?.extra?.eas?.projectId;
  return fromEasConfig || fromExtra;
}

export async function registerForPushAndSaveToken(): Promise<string | null> {
  try {
    const { data: sessData, error: sessErr } = await supabase.auth.getSession();
    if (sessErr) {
      console.log("[push] getSession error:", sessErr.message);
      return null;
    }

    const user = sessData.session?.user;
    if (!user) {
      console.log("[push] no session user yet");
      return null;
    }

    console.log("[push] isDevice:", Device.isDevice, "platform:", Platform.OS);

    const perms = await Notifications.getPermissionsAsync();
    let status = perms.status;
    console.log("[push] permission status:", status);

    if (status !== "granted") {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
      console.log("[push] permission after request:", status);
    }

    if (status !== "granted") {
      console.log("[push] permission not granted; abort");
      return null;
    }

    const projectId = getProjectId();
    console.log("[push] projectId:", projectId ?? "(missing)");

    const tokenResp = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenResp.data;
    console.log("[push] expo token:", token);

    if (!token || !isExpoPushToken(token)) {
      console.log("[push] token missing/invalid format");
      return null;
    }

    const payload = {
      user_id: user.id,
      expo_push_token: token,
      platform: Platform.OS,
      last_seen_at: new Date().toISOString(),
    };

    const { error: upErr } = await supabase
      .from("user_push_tokens")
      .upsert(payload, { onConflict: "user_id,expo_push_token" });

    if (upErr) {
      console.log("[push] upsert error:", upErr.message, upErr);
      return token;
    }

    console.log("[push] token saved OK");
    return token;
  } catch (e: any) {
    console.log("[push] unexpected error:", e?.message ?? String(e));
    return null;
  }
}
