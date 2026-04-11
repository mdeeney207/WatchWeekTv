// web/lib/country.tsx
"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase-browser";

export const COUNTRY_STORAGE_KEY = "ww_country";

export type CountryCode =
  | "US"
  | "CA"
  | "GB"
  | "IE"
  | "DE"
  | "FR"
  | "ES"
  | "PT"
  | "IT"
  | "NL"
  | "SE"
  | "NO"
  | "DK"
  | "AU"
  | "NZ"
  | "BR"
  | "MX"
  | "AR"
  | "CO"
  | "CL"
  | "PE";

export type CountryOption = { code: CountryCode; label: string };

export const COUNTRY_OPTIONS: CountryOption[] = [
  { code: "US", label: "United States" },
  { code: "CA", label: "Canada" },
  { code: "GB", label: "United Kingdom" },
  { code: "IE", label: "Ireland" },
  { code: "DE", label: "Germany" },
  { code: "FR", label: "France" },
  { code: "ES", label: "Spain" },
  { code: "PT", label: "Portugal" },
  { code: "IT", label: "Italy" },
  { code: "NL", label: "Netherlands" },
  { code: "SE", label: "Sweden" },
  { code: "NO", label: "Norway" },
  { code: "DK", label: "Denmark" },
  { code: "AU", label: "Australia" },
  { code: "NZ", label: "New Zealand" },
  { code: "BR", label: "Brazil" },
  { code: "MX", label: "Mexico" },
  { code: "AR", label: "Argentina" },
  { code: "CO", label: "Colombia" },
  { code: "CL", label: "Chile" },
  { code: "PE", label: "Peru" },
];

function isCountryCode(x: string): x is CountryCode {
  return COUNTRY_OPTIONS.some((c) => c.code === x);
}

function guessCountryFromNavigator(): CountryCode {
  // Examples: "en-US", "pt-PT", "es-CO"
  const lang = typeof navigator !== "undefined" ? navigator.language : "";
  const parts = lang.split("-");
  const region = (parts[1] || "").toUpperCase();

  if (isCountryCode(region)) return region;

  // Soft guess for common language-only cases
  const lower = (parts[0] || "").toLowerCase();
  if (lower === "pt") return "PT";
  if (lower === "es") return "ES";
  if (lower === "de") return "DE";
  if (lower === "fr") return "FR";
  if (lower === "it") return "IT";
  if (lower === "nl") return "NL";
  if (lower === "sv") return "SE";
  if (lower === "no" || lower === "nb" || lower === "nn") return "NO";
  if (lower === "da") return "DK";
  if (lower === "en") return "US";

  return "US";
}

function readStoredCountry(): CountryCode | null {
  try {
    const raw = localStorage.getItem(COUNTRY_STORAGE_KEY);
    if (!raw) return null;
    const code = raw.toUpperCase();
    return isCountryCode(code) ? code : null;
  } catch {
    return null;
  }
}

function writeStoredCountry(code: CountryCode) {
  try {
    localStorage.setItem(COUNTRY_STORAGE_KEY, code);
  } catch {
    // ignore
  }
}

type CountryContextValue = {
  country: CountryCode;
  setCountry: (code: CountryCode) => void;
  options: CountryOption[];
};

const CountryContext = createContext<CountryContextValue | null>(null);

export function useCountry() {
  const ctx = useContext(CountryContext);
  if (!ctx) throw new Error("useCountry must be used inside <CountryProvider />");
  return ctx;
}

/**
 * CountryProvider:
 * - Reads from localStorage first
 * - Otherwise guesses from navigator.language
 * - Persists selection to localStorage
 * - If logged in, also writes to profiles.country (best effort)
 */
export function CountryProvider({
  children,
  initialCountry,
}: {
  children: React.ReactNode;
  initialCountry?: CountryCode;
}) {
  const [country, _setCountry] = useState<CountryCode>(initialCountry ?? "US");

  // Bootstrap once on mount
  useEffect(() => {
    const stored = readStoredCountry();
    if (stored) {
      _setCountry(stored);
      return;
    }
    const guessed = guessCountryFromNavigator();
    _setCountry(guessed);
    writeStoredCountry(guessed);
  }, []);

  const setCountry = (code: CountryCode) => {
    _setCountry(code);
    writeStoredCountry(code);
    void persistCountryToProfile(code);
  };

  const value = useMemo(
    () => ({
      country,
      setCountry,
      options: COUNTRY_OPTIONS,
    }),
    [country]
  );

  return <CountryContext.Provider value={value}>{children}</CountryContext.Provider>;
}

async function persistCountryToProfile(country: CountryCode) {
  // Best-effort: if you have a profiles table with a "country" column, this updates it.
  // If you don't, this will no-op safely.
  try {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) return;

    // If your table/column names differ, adjust here:
    await supabase.from("profiles").upsert(
      {
        id: user.id,
        country,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
  } catch {
    // ignore — localStorage still works
  }
}