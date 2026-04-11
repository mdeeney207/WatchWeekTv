"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase-browser";

type AuthShape = {
  userId: string | null;
  userEmail: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthShape | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const applyUser = useCallback((user: User | null) => {
    setUserId(user?.id ?? null);
    setUserEmail(user?.email ?? null);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      // If cookies are missing/expired, treat as logged out.
      applyUser(null);
      setLoading(false);
      return;
    }
    applyUser(data.user ?? null);
    setLoading(false);
  }, [applyUser, supabase]);

  useEffect(() => {
    let alive = true;

    (async () => {
      await refresh();
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      applyUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [applyUser, refresh, supabase]);

  const value: AuthShape = useMemo(
    () => ({ userId, userEmail, loading, refresh }),
    [userId, userEmail, loading, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthShape {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider />");
  return ctx;
}