"use client";

import { useRouter } from "next/navigation";

import {
  LOCALES,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_COOKIE_NAME,
  LOCALE_LABELS,
  type Locale,
} from "@/lib/i18n/config";
import { useI18n } from "@/components/I18nProvider";

function persistLocale(locale: Locale) {
  document.cookie = [
    `${LOCALE_COOKIE_NAME}=${locale}`,
    "Path=/",
    `Max-Age=${LOCALE_COOKIE_MAX_AGE}`,
    "SameSite=Lax",
  ].join("; ");
}

export default function LanguageSwitcher() {
  const router = useRouter();
  const { locale, messages, setLocale } = useI18n();

  function handleChange(nextLocale: Locale) {
    if (nextLocale === locale) return;

    setLocale(nextLocale);
    persistLocale(nextLocale);
    router.refresh();
  }

  return (
    <div
      aria-label={messages.languageSwitcher.label}
      className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.025),0_10px_28px_rgba(0,0,0,0.18)]"
    >
      {LOCALES.map((option) => {
        const active = option === locale;

        return (
          <button
            key={option}
            type="button"
            onClick={() => handleChange(option)}
            title={LOCALE_LABELS[option]}
            aria-pressed={active}
            className={[
              "rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition",
              active
                ? "bg-white text-black"
                : "text-zinc-300 hover:bg-white/[0.06] hover:text-white",
            ].join(" ")}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}