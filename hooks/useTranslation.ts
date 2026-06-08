"use client";

import { useRouter } from "@/i18n/navigation";
import { LOCALE_COOKIE } from "@/i18n/config";
import { useTranslationContext } from "@/components/TranslationProvider";

export function useTranslation() {
  const { locale, messages, languages } = useTranslationContext();
  const router = useRouter();

  function t(key: string, params?: Record<string, string>): string {
    let value = messages[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        value = value.replace(`{${k}}`, v);
      }
    }
    return value;
  }

  function setLanguage(code: string) {
    document.cookie = `${LOCALE_COOKIE}=${code};path=/;max-age=${365 * 24 * 60 * 60}`;
    // Re-run server components (incl. root layout) so the new locale's messages load.
    router.refresh();
  }

  return {
    t,
    currentLanguage: locale,
    availableLanguages: languages,
    setLanguage,
  };
}
