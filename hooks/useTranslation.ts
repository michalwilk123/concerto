"use client";

import { useEffect, useState } from "react";
import { useLocale, useMessages } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";

export function invalidateTranslationCache() {
  // With next-intl, translations are server-loaded.
  // After admin saves, call POST /api/translations/revalidate then router.refresh().
  // This is a no-op placeholder; consumers should call it alongside router.refresh().
}

function flattenMessages(obj: Record<string, unknown>, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      result[fullKey] = value;
    } else if (value && typeof value === "object") {
      Object.assign(result, flattenMessages(value as Record<string, unknown>, fullKey));
    }
  }
  return result;
}

export function useTranslation() {
  const locale = useLocale();
  const nestedMessages = useMessages();
  const flat = flattenMessages(nestedMessages as Record<string, unknown>);
  const router = useRouter();
  const pathname = usePathname();
  const [availableLanguages, setAvailableLanguages] = useState<
    { code: string; label: string; isDefault: boolean }[]
  >([]);

  useEffect(() => {
    fetch("/api/translations/languages")
      .then((r) => r.json())
      .then((data) => {
        if (data.locales) setAvailableLanguages(data.locales);
      })
      .catch(() => {});
  }, []);

  function t(key: string, params?: Record<string, string>): string {
    let value = flat[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        value = value.replace(`{${k}}`, v);
      }
    }
    return value;
  }

  function setLanguage(code: string) {
    document.cookie = `NEXT_LOCALE=${code};path=/;max-age=${365 * 24 * 60 * 60}`;
    router.replace(pathname, { locale: code });
  }

  return {
    t,
    currentLanguage: locale,
    availableLanguages: availableLanguages.map((l) => l.code),
    setLanguage,
  };
}
