"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/components/AuthProvider";
import CountryPicker from "@/components/CountryPicker";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useI18n } from "@/components/I18nProvider";
import { createClient } from "@/lib/supabase-browser";

type TopTab = {
  label: string;
  href: string;
  activeHrefs?: string[];
};

function isPathActive(pathname: string, hrefs: string[]) {
  return hrefs.some((href) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  });
}

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function UtilityButton({
  children,
  onClick,
  className,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "inline-flex h-10 items-center rounded-full border border-white/10",
        "bg-white/[0.035] px-3.5 text-sm font-medium text-zinc-200",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]",
        "transition duration-200",
        "hover:border-white/16 hover:bg-white/[0.06] hover:text-white",
        "focus:outline-none focus:ring-2 focus:ring-sky-400/25",
        className
      )}
    >
      {children}
    </button>
  );
}

function BrandWordmark() {
  return (
    <div className="relative flex items-center">
      <span
        className="select-none text-[27px] font-semibold leading-none tracking-[-0.055em] text-zinc-50 antialiased sm:text-[29px]"
        style={{
          fontFamily:
            'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
          textShadow:
            "0 1px 0 rgba(255,255,255,0.04), 0 0 16px rgba(255,255,255,0.03)",
        }}
      >
        WatchWeek
      </span>

      <span className="pointer-events-none absolute left-[136px] top-[4px] h-[4px] w-[13px] -skew-x-[30deg] rounded-full bg-sky-400/95 shadow-[0_0_16px_rgba(56,189,248,0.4)]" />
    </div>
  );
}

function TopNavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "relative inline-flex h-10 items-center rounded-full px-4 text-sm transition",
        active
          ? "bg-white/[0.08] font-semibold text-white"
          : "font-medium text-zinc-300 hover:bg-white/[0.05] hover:text-white"
      )}
    >
      <span>{label}</span>
      {active ? (
        <span className="absolute inset-x-4 bottom-[5px] h-[2px] rounded-full bg-sky-400 shadow-[0_0_14px_rgba(56,189,248,0.45)]" />
      ) : null}
    </Link>
  );
}

function DropdownLink({
  href,
  label,
  description,
  active,
  onClick,
  stateLabel,
}: {
  href: string;
  label: string;
  description: string;
  active: boolean;
  onClick: () => void;
  stateLabel: string;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "group block rounded-[20px] border px-3.5 py-3 transition duration-200",
        active
          ? "border-sky-400/28 bg-sky-400/[0.10] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
          : "border-white/0 bg-transparent text-zinc-100 hover:border-white/8 hover:bg-white/[0.045]"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold">{label}</span>
        <span
          className={cn(
            "text-[10px] font-semibold uppercase tracking-[0.18em] transition",
            active
              ? "text-sky-300"
              : "text-zinc-500 group-hover:text-zinc-400"
          )}
        >
          {stateLabel}
        </span>
      </div>

      <p
        className={cn(
          "mt-1 text-xs leading-5",
          active ? "text-zinc-300" : "text-zinc-400"
        )}
      >
        {description}
      </p>
    </Link>
  );
}

export default function SiteHeaderClient({
  initialUserId,
  initialUserEmail,
  onOpenSearch,
  onOpenPlatforms,
}: {
  initialUserId: string | null;
  initialUserEmail: string | null;
  onOpenSearch?: () => void;
  onOpenPlatforms?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { userId, userEmail } = useAuth();
  const { messages } = useI18n();

  const [menuOpen, setMenuOpen] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const [optimisticSignedOut, setOptimisticSignedOut] = useState(false);

  const topTabs = useMemo<TopTab[]>(
    () => [
      { label: messages.header.nav.home, href: "/", activeHrefs: ["/"] },
      {
        label: messages.header.nav.worldCup,
        href: "/sports",
        activeHrefs: ["/sports"],
      },
      {
        label: messages.header.nav.calendar,
        href: "/calendar",
        activeHrefs: ["/calendar"],
      },
      { label: messages.header.nav.tv, href: "/tv", activeHrefs: ["/tv"] },
      {
        label: messages.header.nav.movies,
        href: "/movies",
        activeHrefs: ["/movies"],
      },
      {
        label: messages.header.nav.portal,
        href: "/portal",
        activeHrefs: ["/portal", "/library"],
      },
    ],
    [messages]
  );

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const effectiveUserId = useMemo(() => {
    if (optimisticSignedOut) return null;
    if (!hasHydrated) return initialUserId;
    return userId ?? null;
  }, [hasHydrated, initialUserId, optimisticSignedOut, userId]);

  const effectiveUserEmail = useMemo(() => {
    if (optimisticSignedOut) return null;
    if (!hasHydrated) return initialUserEmail;
    return userEmail ?? null;
  }, [hasHydrated, initialUserEmail, optimisticSignedOut, userEmail]);

  const inPortal = useMemo(
    () => pathname === "/portal" || pathname.startsWith("/portal/"),
    [pathname]
  );

  const inLibrary = useMemo(
    () => pathname === "/library" || pathname.startsWith("/library/"),
    [pathname]
  );

  useEffect(() => {
    if (!effectiveUserId) setMenuOpen(false);
  }, [effectiveUserId]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setMenuOpen(false);
        setOptimisticSignedOut(true);
        setLogoutPending(false);
        router.refresh();
      }

      if (event === "SIGNED_IN") {
        setOptimisticSignedOut(false);
        setLogoutPending(false);
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [router, supabase]);

  useEffect(() => {
    if (userId) {
      setOptimisticSignedOut(false);
    }
  }, [userId]);

  async function doLogout() {
    if (logoutPending) return;

    setLogoutPending(true);
    setMenuOpen(false);
    setOptimisticSignedOut(true);

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      router.replace("/");
      router.refresh();
    } catch (error) {
      console.error("WatchWeek logout failed", error);
      setOptimisticSignedOut(false);
      setLogoutPending(false);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/8 bg-[#05070B]/92 backdrop-blur-xl shadow-[0_12px_36px_rgba(0,0,0,0.34)]">
        <div className="relative overflow-visible">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(56,189,248,0.05),transparent_22%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_84%_0%,rgba(37,99,235,0.04),transparent_18%)]" />
            <div className="absolute inset-x-0 bottom-0 h-px bg-white/8" />
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-sky-400/14 to-transparent" />
          </div>

          <div className="relative mx-auto grid h-[76px] w-full max-w-[1440px] grid-cols-[auto_1fr] items-center gap-3 px-4 sm:px-6 lg:grid-cols-[minmax(220px,1fr)_auto_minmax(320px,1fr)] lg:gap-6 lg:px-8 xl:grid-cols-[minmax(240px,1fr)_auto_minmax(420px,1fr)]">
            <div className="min-w-0">
              <Link
                href="/"
                className="group inline-flex shrink-0 items-center transition hover:opacity-95"
                aria-label={messages.header.aria.home}
              >
                <div className="translate-y-[-1px] transition duration-200 group-hover:scale-[1.01]">
                  <BrandWordmark />
                </div>
              </Link>
            </div>

            <nav className="hidden lg:flex lg:justify-center">
              <div className="flex items-center rounded-full border border-white/10 bg-white/[0.025] px-2 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.025),0_8px_24px_rgba(0,0,0,0.16)]">
                {topTabs.map((tab) => {
                  const active = isPathActive(
                    pathname,
                    tab.activeHrefs ?? [tab.href]
                  );

                  return (
                    <TopNavLink
                      key={tab.href}
                      href={tab.href}
                      label={tab.label}
                      active={active}
                    />
                  );
                })}
              </div>
            </nav>

            <div className="flex min-w-0 items-center justify-end gap-2">
              {onOpenSearch ? (
                <UtilityButton
                  onClick={onOpenSearch}
                  title={messages.header.actions.searchTitle}
                  className="hidden xl:inline-flex"
                >
                  <span>{messages.header.actions.search}</span>
                  <span className="ml-2 rounded-full bg-sky-400/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-300">
                    {messages.header.actions.follow}
                  </span>
                </UtilityButton>
              ) : null}

              {onOpenPlatforms ? (
                <UtilityButton
                  onClick={onOpenPlatforms}
                  title={messages.header.actions.platformsTitle}
                  className="hidden xl:inline-flex"
                >
                  {messages.header.actions.platforms}
                </UtilityButton>
              ) : null}

              <div className="hidden md:block">
                <LanguageSwitcher />
              </div>

              <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.025),0_10px_28px_rgba(0,0,0,0.18)]">
                <div className="hidden md:block">
                  <div className="rounded-full border border-white/8 bg-white/[0.025] px-1 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                    <CountryPicker />
                  </div>
                </div>

                <div className="hidden h-6 w-px bg-white/8 md:block" />

                {effectiveUserId ? (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setMenuOpen((v) => !v)}
                      title={effectiveUserEmail ?? messages.header.actions.account}
                      aria-haspopup="menu"
                      aria-expanded={menuOpen}
                      disabled={logoutPending}
                      className={cn(
                        "inline-flex h-10 items-center gap-2 rounded-full px-3.5 text-sm font-medium transition duration-200",
                        menuOpen || inPortal || inLibrary
                          ? "bg-white/[0.08] text-white"
                          : "bg-transparent text-zinc-200 hover:bg-white/[0.055] hover:text-white",
                        logoutPending && "cursor-not-allowed opacity-70"
                      )}
                    >
                      <span>{messages.header.actions.account}</span>
                      <span
                        className={cn(
                          "text-[11px] transition",
                          menuOpen ? "rotate-180 text-white/70" : "text-white/45"
                        )}
                      >
                        ▾
                      </span>
                    </button>

                    {menuOpen ? (
                      <div className="absolute right-0 z-[70] mt-3 w-[330px] overflow-hidden rounded-[24px] border border-white/10 bg-zinc-950/96 backdrop-blur-xl shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
                        <div className="border-b border-white/8 px-4 py-4">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                            {messages.header.actions.account}
                          </div>
                          <div className="mt-1 text-sm font-medium text-zinc-100">
                            {effectiveUserEmail ?? messages.header.actions.signedIn}
                          </div>
                        </div>

                        <div className="p-2.5">
                          <div className="grid gap-2">
                            <DropdownLink
                              href="/portal"
                              label={messages.header.accountMenu.portal}
                              description={
                                messages.header.accountMenu.portalDescription
                              }
                              active={inPortal}
                              onClick={() => setMenuOpen(false)}
                              stateLabel={
                                inPortal ? messages.common.open : messages.common.go
                              }
                            />

                            <DropdownLink
                              href="/library"
                              label={messages.header.accountMenu.library}
                              description={
                                messages.header.accountMenu.libraryDescription
                              }
                              active={inLibrary}
                              onClick={() => setMenuOpen(false)}
                              stateLabel={
                                inLibrary ? messages.common.open : messages.common.go
                              }
                            />
                          </div>

                          <div className="mt-2 border-t border-white/8 pt-2">
                            <button
                              type="button"
                              onClick={doLogout}
                              disabled={logoutPending}
                              className={cn(
                                "block w-full rounded-[20px] px-3.5 py-3 text-left text-sm font-medium transition duration-200",
                                logoutPending
                                  ? "cursor-not-allowed text-zinc-500"
                                  : "text-zinc-200 hover:bg-white/[0.05] hover:text-white"
                              )}
                            >
                              {logoutPending
                                ? messages.header.actions.loggingOut
                                : messages.header.actions.logOut}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <Link
                    href="/login"
                    className="inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold text-zinc-100 transition hover:bg-white/[0.055]"
                  >
                    {messages.header.actions.logIn}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <button
          type="button"
          aria-label={messages.header.aria.closeAccountMenu}
          className="fixed inset-0 z-40 cursor-default"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}
    </>
  );
}