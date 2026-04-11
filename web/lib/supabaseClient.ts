// lib/supabaseClient.ts
// ✅ DO NOT use @supabase/supabase-js createClient() in this project.
// Use the SSR-compatible browser client from @supabase/ssr instead.

import { createBrowserClient } from "@supabase/ssr";

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);