"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter, useSearchParams } from "next/navigation";

type OAuthProvider = "google" | "apple";
type AuthMode = "login" | "signup";

type AuthCardProps = {
  mode?: AuthMode;
  nextOverride?: string | null;
  intentOverride?: string | null;
  onSuccessHome?: () => void;
  onBack?: () => void;
  showBackButton?: boolean;
  backLabel?: string;
  compact?: boolean;
  surfaceClassName?: string;
};

export default function AuthCard({
  mode = "signup",
  nextOverride,
  intentOverride,
  onBack,
  showBackButton = false,
  backLabel = "Back",
  compact = false,
  surfaceClassName,
}: AuthCardProps) {
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

  const [email, setEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryNext = searchParams.get("next");
  const queryIntent = searchParams.get("intent");

  const next = nextOverride ?? queryNext;
  const intent = intentOverride ?? queryIntent;

  const isUpgradeIntent =
    intent === "upgrade" || next === "/pricing" || next === "/portal/billing";

  function buildCallbackUrl() {
    const origin = window.location.origin;
    return next
      ? `${origin}/auth/callback?next=${encodeURIComponent(next)}`
      : `${origin}/auth/callback`;
  }

  async function onSendLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSent(false);
    setEmailLoading(true);

    try {
      const callbackUrl = buildCallbackUrl();

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: callbackUrl,
        },
      });

      if (error) throw error;

      setSent(true);
    } catch (err: any) {
      setError(err?.message ?? "Sign-in failed");
    } finally {
      setEmailLoading(false);
    }
  }

  async function onOAuth(provider: OAuthProvider) {
    setError(null);
    setSent(false);
    setOauthLoading(provider);

    try {
      const redirectTo = buildCallbackUrl();

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
        },
      });

      if (error) throw error;
    } catch (err: any) {
      setError(err?.message ?? `Could not continue with ${provider}`);
      setOauthLoading(null);
    }
  }

  const heading = isUpgradeIntent
    ? "Create your account to unlock Premium."
    : mode === "login"
      ? "Log in to WatchWeek."
      : "Create your WatchWeek account.";

  const subheading = isUpgradeIntent
    ? "Start with your free account, then upgrade for unlimited follows, reminders, and a real streaming calendar across every device."
    : mode === "login"
      ? "Get back to your followed shows, tonight’s drops, and your streaming calendar."
      : "Start free and track shows, see what drops tonight, and use one calendar across your streaming life.";

  const cardTitle = isUpgradeIntent
    ? "Continue to Premium setup"
    : mode === "login"
      ? "Continue to WatchWeek"
      : "Create your free account";

  return (
    <div
      className={
        surfaceClassName ??
        (compact
          ? "rounded-[28px] bg-white/[0.045] p-5 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.95)] ring-1 ring-white/10 md:p-6"
          : "rounded-[32px] bg-white/[0.045] p-5 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.95)] ring-1 ring-white/10 md:p-6")
      }
    >
      {!compact ? (
        <div className="mb-5">
          <div className="text-[11px] font-semibold tracking-[0.22em] text-zinc-500">
            WATCHWEEK ACCOUNT
          </div>

          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-5xl">
            {heading}
          </h1>

          <p className="mt-4 max-w-xl text-base text-zinc-300 md:text-lg">
            {subheading}
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <ValueCard
              title="Track across services"
              detail="Keep your followed shows in one place instead of checking every app."
            />
            <ValueCard
              title="Episode countdowns"
              detail="See what starts soon and what matters tonight at a glance."
            />
            <ValueCard
              title="Upgrade anytime"
              detail="Go Premium for unlimited follows, reminders, and more."
            />
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-zinc-400">
            <span className="rounded-full bg-white/5 px-3 py-1.5 ring-1 ring-white/10">
              Sign in across devices
            </span>
            <span className="rounded-full bg-white/5 px-3 py-1.5 ring-1 ring-white/10">
              Email fallback included
            </span>
          </div>
        </div>
      ) : (
        <div className="mb-5">
          <div className="text-xl font-semibold text-white">{cardTitle}</div>
          <div className="mt-1 text-sm text-zinc-400">
            {mode === "login"
              ? "Use Google, Apple, or your email to sign in."
              : "Choose the fastest way to create your account and continue."}
          </div>
        </div>
      )}

      {compact ? null : (
        <div className="mb-5 border-t border-transparent pt-0 text-left">
          <div className="text-xl font-semibold text-white">{cardTitle}</div>
          <div className="mt-1 text-sm text-zinc-400">
            Choose the fastest way to sign in or create your account.
          </div>
        </div>
      )}

      <div className="space-y-3">
        <OAuthButton
          label="Continue with Google"
          loadingLabel="Continuing with Google…"
          loading={oauthLoading === "google"}
          onClick={() => onOAuth("google")}
          icon={<GoogleIcon />}
        />

        <OAuthButton
          label="Continue with Apple"
          loadingLabel="Continuing with Apple…"
          loading={oauthLoading === "apple"}
          onClick={() => onOAuth("apple")}
          icon={<AppleIcon />}
        />
      </div>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
          Or continue with email
        </span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <form onSubmit={onSendLink} className="space-y-4">
        <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
          <label className="mb-2 block text-sm text-zinc-300">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="w-full rounded-2xl bg-black/50 px-4 py-3 text-white ring-1 ring-white/10 outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-emerald-500/60"
            required
          />
        </div>

        {error ? (
          <div className="rounded-2xl bg-red-500/10 p-4 text-sm text-red-200 ring-1 ring-red-500/20">
            {error}
          </div>
        ) : null}

        {sent ? (
          <div className="rounded-2xl bg-emerald-500/10 p-4 text-sm text-emerald-100 ring-1 ring-emerald-500/20">
            Magic link sent. Check your email, then click the link to continue.
          </div>
        ) : null}

        <button
          type="submit"
          disabled={emailLoading || oauthLoading !== null}
          className="w-full rounded-full bg-emerald-500 px-4 py-3.5 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-60"
        >
          {emailLoading
            ? "Sending…"
            : mode === "login"
              ? "Continue with email"
              : "Create account with email"}
        </button>

        {showBackButton ? (
          <button
            type="button"
            className="w-full rounded-full bg-white/8 px-4 py-3.5 text-sm font-medium text-white ring-1 ring-white/10 transition hover:bg-white/12"
            onClick={() => {
              if (onBack) {
                onBack();
                return;
              }
              router.push("/");
            }}
          >
            {backLabel}
          </button>
        ) : null}
      </form>

      <div className="mt-5 border-t border-white/10 pt-4 text-xs leading-5 text-zinc-500">
        Google and Apple sign-in must also be enabled in Supabase Auth provider
        settings. Use the same account method again later to return to
        WatchWeek.
      </div>
    </div>
  );
}

function OAuthButton({
  label,
  loadingLabel,
  loading,
  onClick,
  icon,
}: {
  label: string;
  loadingLabel: string;
  loading: boolean;
  onClick: () => void;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="flex w-full items-center justify-center gap-3 rounded-full bg-white px-4 py-3.5 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-60"
    >
      <span className="shrink-0">{icon}</span>
      <span>{loading ? loadingLabel : label}</span>
    </button>
  );
}

function ValueCard({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl bg-white/[0.035] p-4 ring-1 ring-white/10">
      <div className="text-sm font-semibold text-white">{title}</div>
      <div className="mt-1.5 text-sm leading-6 text-zinc-400">{detail}</div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
    >
      <path
        d="M21.805 12.23c0-.68-.06-1.333-.173-1.96H12v3.708h5.498a4.703 4.703 0 0 1-2.04 3.087v2.565h3.305c1.935-1.781 3.042-4.406 3.042-7.4Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.76 0 5.074-.915 6.764-2.47l-3.305-2.565c-.915.613-2.083.975-3.459.975-2.655 0-4.906-1.792-5.71-4.2H2.874v2.647A9.998 9.998 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.29 13.74A5.996 5.996 0 0 1 5.97 12c0-.604.109-1.19.32-1.74V7.613H2.874A9.998 9.998 0 0 0 2 12c0 1.61.385 3.136 1.074 4.387L6.29 13.74Z"
        fill="#FBBC05"
      />
      <path
        d="M12 6.06c1.5 0 2.848.516 3.91 1.53l2.933-2.933C17.07 3.01 14.756 2 12 2 8.074 2 4.69 4.238 3.074 7.613L6.29 10.26c.804-2.408 3.055-4.2 5.71-4.2Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="currentColor"
    >
      <path d="M16.365 12.69c.02 2.178 1.91 2.903 1.93 2.912-.016.051-.301 1.032-.992 2.045-.597.875-1.217 1.747-2.193 1.764-.958.018-1.266-.567-2.363-.567-1.096 0-1.439.549-2.346.585-.941.035-1.658-.944-2.26-1.816-1.229-1.778-2.168-5.02-.907-7.21.626-1.088 1.746-1.776 2.962-1.794.925-.018 1.799.621 2.363.621.563 0 1.62-.768 2.73-.655.465.02 1.772.188 2.61 1.414-.067.042-1.556.908-1.534 2.701Zm-2.188-5.12c.5-.607.836-1.453.744-2.295-.721.03-1.595.48-2.112 1.086-.464.54-.871 1.402-.761 2.228.804.062 1.629-.409 2.129-1.018Z" />
    </svg>
  );
}