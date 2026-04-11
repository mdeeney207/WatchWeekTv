"use client";

import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AuthCard from "@/components/auth/AuthCard";

type AuthMode = "login" | "signup";

type AuthModalContextValue = {
  openAuth: (mode?: AuthMode) => void;
  closeAuth: () => void;
};

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function useHomepageAuthModal() {
  const ctx = useContext(AuthModalContext);

  if (!ctx) {
    throw new Error(
      "useHomepageAuthModal must be used within HomepageAuthShell"
    );
  }

  return ctx;
}

export default function HomepageAuthShell({
  children,
}: {
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("signup");

  const openAuth = useCallback((nextMode: AuthMode = "signup") => {
    setMode(nextMode);
    setOpen(true);
  }, []);

  const closeAuth = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const value = useMemo(
    () => ({
      openAuth,
      closeAuth,
    }),
    [openAuth, closeAuth]
  );

  return (
    <AuthModalContext.Provider value={value}>
      {children}

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6"
          aria-modal="true"
          role="dialog"
        >
          <button
            type="button"
            aria-label="Close auth modal"
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={closeAuth}
          />

          <div className="relative z-[101] w-full max-w-2xl">
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={closeAuth}
                className="inline-flex h-11 items-center rounded-2xl bg-white/8 px-4 text-sm font-medium text-white ring-1 ring-white/10 transition hover:bg-white/12"
              >
                Close
              </button>
            </div>

            <AuthCard
              mode={mode}
              compact
              showBackButton
              backLabel="Back to homepage"
              onBack={closeAuth}
            />
          </div>
        </div>
      ) : null}
    </AuthModalContext.Provider>
  );
}