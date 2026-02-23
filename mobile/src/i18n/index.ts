// mobile/src/i18n/index.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Avoid hard-crash if ExpoLocalization native module isn't present (Expo Go / dev client mismatch)
let ExpoLocalization: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ExpoLocalization = require("expo-localization");
} catch {
  ExpoLocalization = null;
}

import en from "./en.json";
import es from "./es.json";
import zh from "./zh.json";
import ru from "./ru.json";

const resources = {
  en: { translation: en },
  es: { translation: es },
  zh: { translation: zh },
  ru: { translation: ru },
} as const;

export const DEFAULT_LANG = "en" as const;

// Persisted manual override key
const LANG_STORAGE_KEY = "watchweek.language";

function normalizeLangTag(tag?: string) {
  const base = (tag || DEFAULT_LANG).split("-")[0].toLowerCase();
  if (base === "en" || base === "es" || base === "zh" || base === "ru") return base;
  return DEFAULT_LANG;
}

function detectDeviceLanguage(): string {
  // Try expo-localization if native module exists
  const locales = ExpoLocalization?.getLocales?.() ?? [];
  const first = locales[0]?.languageTag ?? locales[0]?.languageCode;
  if (first) return normalizeLangTag(first);

  // Fallback: Intl (works in Hermes)
  const intlLocale = (Intl as any)?.DateTimeFormat?.()?.resolvedOptions?.()?.locale ?? DEFAULT_LANG;
  return normalizeLangTag(intlLocale);
}

/**
 * Initialize i18n.
 * - Uses saved manual override if present
 * - Otherwise uses device locale
 */
export async function initI18n() {
  if (i18n.isInitialized) return i18n;

  let initialLang = DEFAULT_LANG;

  try {
    const saved = await AsyncStorage.getItem(LANG_STORAGE_KEY);
    if (saved) initialLang = normalizeLangTag(saved);
    else initialLang = detectDeviceLanguage();
  } catch {
    initialLang = detectDeviceLanguage();
  }

  await i18n.use(initReactI18next).init({
    resources,
    lng: initialLang,
    fallbackLng: DEFAULT_LANG,
    interpolation: { escapeValue: false },
    returnNull: false,
    returnEmptyString: false,
    compatibilityJSON: "v4",
  });

  return i18n;
}

/**
 * Change app language and persist the override.
 */
export async function setAppLanguage(lang: string) {
  const normalized = normalizeLangTag(lang);

  try {
    await AsyncStorage.setItem(LANG_STORAGE_KEY, normalized);
  } catch {
    // ignore storage failure; language still changes in-memory
  }

  await i18n.changeLanguage(normalized);
  return normalized;
}

/**
 * Remove manual override and go back to device language.
 */
export async function clearAppLanguageOverride() {
  try {
    await AsyncStorage.removeItem(LANG_STORAGE_KEY);
  } catch {}

  const device = detectDeviceLanguage();
  await i18n.changeLanguage(device);
  return device;
}

/**
 * Read current manual override (if any).
 */
export async function getSavedAppLanguage(): Promise<string | null> {
  try {
    const saved = await AsyncStorage.getItem(LANG_STORAGE_KEY);
    return saved ? normalizeLangTag(saved) : null;
  } catch {
    return null;
  }
}

export default i18n;