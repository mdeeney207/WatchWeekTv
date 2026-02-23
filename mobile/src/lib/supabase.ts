// mobile/src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ✅ Correct source for EAS env vars
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

// ✅ Pre-beta: keep logs only in dev
if (__DEV__) {
  console.log("SUPABASE_URL(runtime):", supabaseUrl);
  console.log("SUPABASE_KEY(first10):", supabaseAnonKey?.slice(0, 10));
}

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase config. EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY not set."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
