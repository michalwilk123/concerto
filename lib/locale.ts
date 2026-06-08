import { cookies } from "next/headers";
import { defaultLocale, LOCALE_COOKIE } from "@/i18n/config";
import { getActiveLanguages } from "@/lib/services/translation-service";

export interface ResolvedLocale {
  code: string;
  rtl: boolean;
}

/**
 * Resolve the active UI locale from the NEXT_LOCALE cookie, validated against
 * the enabled languages in the DB. Falls back to the default language.
 * Server-only (reads cookies()).
 */
export async function resolveLocale(): Promise<ResolvedLocale> {
  const languages = await getActiveLanguages();
  const fallback =
    languages.find((l) => l.isDefault) ?? languages[0] ?? { code: defaultLocale, rtl: false };

  const cookieStore = await cookies();
  const requested = cookieStore.get(LOCALE_COOKIE)?.value?.trim().toLowerCase();

  const match = requested ? languages.find((l) => l.code === requested) : undefined;
  const chosen = match ?? fallback;

  return { code: chosen.code, rtl: chosen.rtl };
}
