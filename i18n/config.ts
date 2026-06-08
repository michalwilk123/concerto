export const SUPPORTED_LOCALES = [
  { code: "eng", label: "English" },
  { code: "pl", label: "Polski" },
  { code: "it", label: "Italiano" },
  { code: "es", label: "Espanol" },
  { code: "ua", label: "Ukrainska" },
  { code: "ru", label: "Russkiy" },
  { code: "ar", label: "Arabic" },
  { code: "fr", label: "Francais" },
  { code: "de", label: "Deutsch" },
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]["code"];

export const ALL_SUPPORTED_LOCALES = SUPPORTED_LOCALES.map((locale) => locale.code);
export const SUPPORTED_LOCALE_CODES = new Set<string>(ALL_SUPPORTED_LOCALES);
export const SUPPORTED_LOCALE_LABELS: Record<string, string> = Object.fromEntries(
  SUPPORTED_LOCALES.map((locale) => [locale.code, locale.label]),
);

const LOCALE_ALIASES: Record<string, SupportedLocale> = {
  en: "eng",
  uk: "ua",
};

export const defaultLocale: SupportedLocale = "eng";

// Cookie that stores the user's chosen UI locale. Client-safe constant so it
// can be shared between the client hook and the server-side resolver.
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function normalizeSupportedLocaleCode(locale: string): string {
  const normalized = locale.trim().toLowerCase();
  return LOCALE_ALIASES[normalized] ?? normalized;
}

export function getSupportedLocaleLabel(locale: string): string {
  return SUPPORTED_LOCALE_LABELS[normalizeSupportedLocaleCode(locale)] ?? locale;
}
