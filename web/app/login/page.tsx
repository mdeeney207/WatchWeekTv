"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "@/components/I18nProvider";

type OAuthProvider = "google" | "apple";
type AuthMode = "signin" | "signup";

function getAuthErrorMessage(
  value: string | null,
  messages: ReturnType<typeof useI18n>["messages"]
) {
  switch (value) {
    case "missing_code":
      return messages.login.errors.missingCode;
    case "auth_callback_failed":
      return messages.login.errors.authCallbackFailed;
    case "reset_link_invalid":
      return messages.login.errors.resetLinkInvalid;
    default:
      return null;
  }
}

function getAuthNoticeMessage(
  value: string | null,
  messages: ReturnType<typeof useI18n>["messages"]
) {
  switch (value) {
    case "password_reset_success":
      return messages.login.notices.passwordResetSuccess;
    default:
      return null;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { messages } = useI18n();

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const next = searchParams.get("next");
  const intent = searchParams.get("intent");
  const errorParam = searchParams.get("error");
  const noticeParam = searchParams.get("notice");

  const isUpgradeIntent =
    intent === "upgrade" || next === "/pricing" || next === "/portal/billing";

  useEffect(() => {
    setError(getAuthErrorMessage(errorParam, messages));
    setNotice(getAuthNoticeMessage(noticeParam, messages));
  }, [errorParam, noticeParam, messages]);

  function getSafeNext() {
    if (!next) return "/calendar";
    if (!next.startsWith("/")) return "/calendar";
    if (next.startsWith("//")) return "/calendar";
    return next;
  }

  function buildCallbackUrl() {
    const origin = window.location.origin;
    const safeNext = getSafeNext();
    return `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;
  }

  function buildResetPasswordUrl() {
    const url = new URL("/auth/confirm", window.location.origin);
    url.searchParams.set("next", "/reset-password");
    return url.toString();
  }

  async function onPasswordSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setPasswordLoading(true);

    try {
      if (!email.trim()) {
        throw new Error(messages.login.errors.enterEmail);
      }

      if (!password.trim()) {
        throw new Error(messages.login.errors.enterPassword);
      }

      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        router.push(getSafeNext());
        router.refresh();
        return;
      }

      const callbackUrl = buildCallbackUrl();

      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: callbackUrl,
        },
      });

      if (error) throw error;

      setNotice(messages.login.notices.accountCreated);
      setMode("signin");
    } catch (err: any) {
      setError(err?.message ?? messages.login.errors.authFailed);
    } finally {
      setPasswordLoading(false);
    }
  }

  async function onSendMagicLink() {
    setError(null);
    setNotice(null);
    setMagicLinkLoading(true);

    try {
      if (!email.trim()) {
        throw new Error(messages.login.errors.enterEmailFirst);
      }

      const callbackUrl = buildCallbackUrl();

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: callbackUrl,
        },
      });

      if (error) throw error;

      setNotice(messages.login.notices.magicLinkSent);
    } catch (err: any) {
      setError(err?.message ?? messages.login.errors.magicLinkFailed);
    } finally {
      setMagicLinkLoading(false);
    }
  }

  async function onForgotPassword() {
    setError(null);
    setNotice(null);
    setForgotPasswordLoading(true);

    try {
      if (!email.trim()) {
        throw new Error(messages.login.errors.enterEmailFirst);
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: buildResetPasswordUrl(),
      });

      if (error) throw error;

      setNotice(messages.login.notices.resetSent);
    } catch (err: any) {
      setError(err?.message ?? messages.login.errors.resetFailed);
    } finally {
      setForgotPasswordLoading(false);
    }
  }

  async function onOAuth(provider: OAuthProvider) {
    setError(null);
    setNotice(null);
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
      setError(
        err?.message ??
          `${messages.login.errors.oauthFailedPrefix} ${provider}.`
      );
      setOauthLoading(null);
    }
  }

  const disableActions =
    passwordLoading ||
    magicLinkLoading ||
    forgotPasswordLoading ||
    oauthLoading !== null;

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="relative overflow-hidden border-t border-white/5 pt-24 pb-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.16),transparent_30%),radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.07),transparent_24%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black" />

        <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,520px)] lg:px-10">
          <div className="max-w-2xl pt-2 lg:pt-10">
            <div className="text-[11px] font-semibold tracking-[0.22em] text-zinc-500">
              {messages.login.eyebrow}
            </div>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-5xl">
              {isUpgradeIntent
                ? messages.login.titles.upgrade
                : messages.login.titles.default}
            </h1>

            <p className="mt-4 max-w-xl text-base text-zinc-300 md:text-lg">
              {isUpgradeIntent
                ? messages.login.descriptions.upgrade
                : messages.login.descriptions.default}
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <ValueCard
                title={messages.login.cards.trackTitle}
                detail={messages.login.cards.trackDetail}
              />
              <ValueCard
                title={messages.login.cards.countdownsTitle}
                detail={messages.login.cards.countdownsDetail}
              />
              <ValueCard
                title={messages.login.cards.upgradeTitle}
                detail={messages.login.cards.upgradeDetail}
              />
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-zinc-400">
              <span className="rounded-full bg-white/5 px-3 py-1.5 ring-1 ring-white/10">
                {messages.login.pills.crossDevice}
              </span>
              <span className="rounded-full bg-white/5 px-3 py-1.5 ring-1 ring-white/10">
                {messages.login.pills.passwordEnabled}
              </span>
            </div>
          </div>

          <div className="lg:pt-4">
            <div className="rounded-[32px] bg-white/[0.045] p-5 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.95)] ring-1 ring-white/10 md:p-6">
              <div className="mb-5">
                <div className="text-xl font-semibold text-white">
                  {isUpgradeIntent
                    ? messages.login.panel.titleUpgrade
                    : messages.login.panel.titleDefault}
                </div>
                <div className="mt-1 text-sm text-zinc-400">
                  {messages.login.panel.subtitle}
                </div>
              </div>

              <div className="mb-5 grid grid-cols-2 rounded-full bg-white/5 p-1 ring-1 ring-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setError(null);
                    setNotice(null);
                  }}
                  className={[
                    "rounded-full px-4 py-2.5 text-sm font-semibold transition",
                    mode === "signin"
                      ? "bg-white text-black"
                      : "text-zinc-300 hover:bg-white/5",
                  ].join(" ")}
                >
                  {messages.login.modes.signIn}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setError(null);
                    setNotice(null);
                  }}
                  className={[
                    "rounded-full px-4 py-2.5 text-sm font-semibold transition",
                    mode === "signup"
                      ? "bg-white text-black"
                      : "text-zinc-300 hover:bg-white/5",
                  ].join(" ")}
                >
                  {messages.login.modes.signUp}
                </button>
              </div>

              <div className="space-y-3">
                <OAuthButton
                  label={messages.login.oauth.google}
                  loadingLabel={messages.login.oauth.googleLoading}
                  loading={oauthLoading === "google"}
                  onClick={() => onOAuth("google")}
                  icon={<GoogleIcon />}
                />

                <OAuthButton
                  label={messages.login.oauth.apple}
                  loadingLabel={messages.login.oauth.appleLoading}
                  loading={oauthLoading === "apple"}
                  onClick={() => onOAuth("apple")}
                  icon={<AppleIcon />}
                />
              </div>

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
                  {messages.login.divider}
                </span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <form onSubmit={onPasswordSubmit} className="space-y-4">
                <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                  <label className="mb-2 block text-sm text-zinc-300">
                    {messages.login.form.emailLabel}
                  </label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder={messages.login.form.emailPlaceholder}
                    className="w-full rounded-2xl bg-black/50 px-4 py-3 text-white ring-1 ring-white/10 outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-emerald-500/60"
                    required
                  />
                </div>

                <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
                  <label className="mb-2 block text-sm text-zinc-300">
                    {messages.login.form.passwordLabel}
                  </label>
                  <div className="flex items-center gap-2 rounded-2xl bg-black/50 pr-2 ring-1 ring-white/10 focus-within:ring-2 focus-within:ring-emerald-500/60">
                    <input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type={showPassword ? "text" : "password"}
                      autoComplete={
                        mode === "signin" ? "current-password" : "new-password"
                      }
                      placeholder={
                        mode === "signin"
                          ? messages.login.form.passwordPlaceholderSignIn
                          : messages.login.form.passwordPlaceholderSignUp
                      }
                      className="w-full bg-transparent px-4 py-3 text-white outline-none placeholder:text-zinc-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="rounded-full px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-white/10"
                    >
                      {showPassword
                        ? messages.login.form.hide
                        : messages.login.form.show}
                    </button>
                  </div>

                  {mode === "signin" ? (
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={onForgotPassword}
                        disabled={disableActions}
                        className="text-sm font-medium text-emerald-300 transition hover:text-emerald-200 disabled:opacity-60"
                      >
                        {forgotPasswordLoading
                          ? messages.login.form.forgotPasswordLoading
                          : messages.login.form.forgotPassword}
                      </button>
                    </div>
                  ) : null}
                </div>

                {error ? (
                  <div className="rounded-2xl bg-red-500/10 p-4 text-sm text-red-200 ring-1 ring-red-500/20">
                    {error}
                  </div>
                ) : null}

                {notice ? (
                  <div className="rounded-2xl bg-emerald-500/10 p-4 text-sm text-emerald-100 ring-1 ring-emerald-500/20">
                    {notice}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={disableActions}
                  className="w-full rounded-full bg-emerald-500 px-4 py-3.5 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-60"
                >
                  {passwordLoading
                    ? mode === "signin"
                      ? messages.login.form.submitSignInLoading
                      : messages.login.form.submitSignUpLoading
                    : mode === "signin"
                      ? messages.login.form.submitSignIn
                      : messages.login.form.submitSignUp}
                </button>

                <button
                  type="button"
                  onClick={onSendMagicLink}
                  disabled={disableActions}
                  className="w-full rounded-full bg-white/8 px-4 py-3.5 text-sm font-medium text-white ring-1 ring-white/10 transition hover:bg-white/12 disabled:opacity-60"
                >
                  {magicLinkLoading
                    ? messages.login.form.magicLinkLoading
                    : messages.login.form.magicLink}
                </button>

                <button
                  type="button"
                  className="w-full rounded-full bg-white/8 px-4 py-3.5 text-sm font-medium text-white ring-1 ring-white/10 transition hover:bg-white/12"
                  onClick={() => router.push("/")}
                >
                  {messages.login.form.backHome}
                </button>
              </form>

              <div className="mt-5 border-t border-white/10 pt-4 text-xs leading-5 text-zinc-500">
                {messages.login.footer}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
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
  icon: React.ReactNode;
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
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
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
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M16.365 12.69c.02 2.178 1.91 2.903 1.93 2.912-.016.051-.301 1.032-.992 2.045-.597.875-1.217 1.747-2.193 1.764-.958.018-1.266-.567-2.363-.567-1.096 0-1.439.549-2.346.585-.941.035-1.658-.944-2.26-1.816-1.229-1.778-2.168-5.02-.907-7.21.626-1.088 1.746-1.776 2.962-1.794.925-.018 1.799.621 2.363.621.563 0 1.62-.768 2.73-.655.465.02 1.772.188 2.61 1.414-.067.042-1.556.908-1.534 2.701Zm-2.188-5.12c.5-.607.836-1.453.744-2.295-.721.03-1.595.48-2.112 1.086-.464.54-.871 1.402-.761 2.228.804.062 1.629-.409 2.129-1.018Z" />
    </svg>
  );
}