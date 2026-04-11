"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter, useSearchParams } from "next/navigation";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let timeoutId: number | null = null;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;

      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session) {
        setReady(true);
        setCheckingSession(false);
        setError(null);
      }
    });

    async function bootstrap() {
      const errorParam = searchParams.get("error");

      if (errorParam === "reset_link_invalid") {
        setError("This password reset link is invalid or expired. Request a new one from the login page.");
        setCheckingSession(false);
        return;
      }

      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!active) return;

        if (error) {
          throw error;
        }

        if (session) {
          setReady(true);
          setCheckingSession(false);
          return;
        }

        timeoutId = window.setTimeout(async () => {
          const {
            data: { session: retrySession },
          } = await supabase.auth.getSession();

          if (!active) return;

          if (retrySession) {
            setReady(true);
            setError(null);
          } else {
            setReady(false);
            setError(
              "This password reset link is invalid or expired. Request a new one from the login page."
            );
          }

          setCheckingSession(false);
        }, 700);
      } catch (err: any) {
        if (!active) return;
        setError(err?.message ?? "Could not verify your reset link.");
        setCheckingSession(false);
      }
    }

    void bootstrap();

    return () => {
      active = false;
      subscription.unsubscribe();
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [searchParams, supabase]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSaving(true);

    try {
      if (!password.trim()) {
        throw new Error("Enter a new password.");
      }

      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters.");
      }

      if (password !== confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) throw error;

      setNotice("Password updated. Redirecting to sign in…");

      await supabase.auth.signOut();

      window.setTimeout(() => {
        router.replace("/login?notice=password_reset_success");
      }, 800);
    } catch (err: any) {
      setError(err?.message ?? "Could not update your password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="relative overflow-hidden border-t border-white/5 pt-24 pb-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.16),transparent_30%),radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.07),transparent_24%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black" />

        <div className="relative mx-auto w-full max-w-3xl px-6 lg:px-10">
          <div className="rounded-[32px] bg-white/[0.045] p-5 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.95)] ring-1 ring-white/10 md:p-6">
            <div className="mb-5">
              <div className="text-[11px] font-semibold tracking-[0.22em] text-zinc-500">
                WATCHWEEK ACCOUNT
              </div>
              <div className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                Reset your password
              </div>
              <div className="mt-2 text-sm text-zinc-400">
                Choose a new password for your WatchWeek account.
              </div>
            </div>

            {checkingSession ? (
              <div className="rounded-2xl bg-white/[0.04] p-5 text-sm text-zinc-300 ring-1 ring-white/10">
                Verifying your reset link…
              </div>
            ) : null}

            {!checkingSession && error ? (
              <div className="space-y-4">
                <div className="rounded-2xl bg-red-500/10 p-4 text-sm text-red-200 ring-1 ring-red-500/20">
                  {error}
                </div>

                <button
                  type="button"
                  onClick={() => router.replace("/login")}
                  className="w-full rounded-full bg-white/8 px-4 py-3.5 text-sm font-medium text-white ring-1 ring-white/10 transition hover:bg-white/12"
                >
                  Back to login
                </button>
              </div>
            ) : null}

            {!checkingSession && ready ? (
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                  <label className="mb-2 block text-sm text-zinc-300">New password</label>
                  <div className="flex items-center gap-2 rounded-2xl bg-black/50 pr-2 ring-1 ring-white/10 focus-within:ring-2 focus-within:ring-emerald-500/60">
                    <input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Create a new password"
                      className="w-full bg-transparent px-4 py-3 text-white outline-none placeholder:text-zinc-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="rounded-full px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-white/10"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                  <label className="mb-2 block text-sm text-zinc-300">Confirm password</label>
                  <input
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Re-enter your new password"
                    className="w-full rounded-2xl bg-black/50 px-4 py-3 text-white ring-1 ring-white/10 outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-emerald-500/60"
                    required
                  />
                </div>

                {notice ? (
                  <div className="rounded-2xl bg-emerald-500/10 p-4 text-sm text-emerald-100 ring-1 ring-emerald-500/20">
                    {notice}
                  </div>
                ) : null}

                {error ? (
                  <div className="rounded-2xl bg-red-500/10 p-4 text-sm text-red-200 ring-1 ring-red-500/20">
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-full bg-emerald-500 px-4 py-3.5 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-60"
                >
                  {saving ? "Updating password…" : "Update password"}
                </button>

                <button
                  type="button"
                  onClick={() => router.replace("/login")}
                  className="w-full rounded-full bg-white/8 px-4 py-3.5 text-sm font-medium text-white ring-1 ring-white/10 transition hover:bg-white/12"
                >
                  Back to login
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}