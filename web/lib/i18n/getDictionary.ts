import type { Locale } from "./config";
import { en, type Messages } from "./dictionaries/en";
import { es } from "./dictionaries/es";

export function getDictionary(locale: Locale): Messages {
  return locale === "es" ? es : en;
}