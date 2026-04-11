import { cookies, headers } from "next/headers";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  type Locale,
  isLocale,
} from "./config";

function getLocaleFromAcceptLanguage(headerValue: string | null): Locale {
  const raw = String(headerValue ?? "").toLowerCase();

  if (raw.includes("es")) {
    return "es";
  }

  return DEFAULT_LOCALE;
}

export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(LOCALE_COOKIE_NAME)?.value;

  if (isLocale(cookieValue)) {
    return cookieValue;
  }

  const headerStore = await headers();
  return getLocaleFromAcceptLanguage(headerStore.get("accept-language"));
}