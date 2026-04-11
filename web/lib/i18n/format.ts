import type { Locale } from "@/lib/i18n/config";

export function getIntlLocale(locale: Locale): string {
  return locale === "es" ? "es-ES" : "en-US";
}

export function formatDateObject(
  locale: Locale,
  value: Date,
  options: Intl.DateTimeFormatOptions
): string {
  return new Intl.DateTimeFormat(getIntlLocale(locale), options).format(value);
}

export function formatDateValue(
  locale: Locale,
  value: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions,
  fallback = "—"
): string {
  if (!value) return fallback;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return formatDateObject(locale, date, options);
}

export function formatMoneyValue(
  locale: Locale,
  amountCents: number | null,
  currency: string | null,
  fallback = "—"
): string {
  if (amountCents == null || !currency) return fallback;

  try {
    return new Intl.NumberFormat(getIntlLocale(locale), {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amountCents / 100);
  } catch {
    return `${(amountCents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}