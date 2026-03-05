"use client";

import { useEffect, useState } from "react";
import { translationsApi } from "@/lib/api-client";
import { defaultTranslations } from "@/lib/translations";

const LANGUAGE_KEY = "concerto-language";

// Module-level cache — fetched once, shared across all hook instances
let cachedOverrides: Record<string, string> | null = null;
let cachedLanguageName: string | null = null;
let cachedAvailableLanguages: string[] | null = null;

let fetchPromise: Promise<void> | null = null;
let languagesFetchPromise: Promise<void> | null = null;

const listeners = new Set<() => void>();

function notifyListeners() {
  for (const cb of listeners) cb();
}

export function invalidateTranslationCache() {
  cachedOverrides = null;
  cachedLanguageName = null;
  cachedAvailableLanguages = null;
  fetchPromise = null;
  languagesFetchPromise = null;
  notifyListeners();
}

function getStoredLanguage(): string {
  if (typeof window === "undefined") return "default";
  return localStorage.getItem(LANGUAGE_KEY) ?? "default";
}

function ensureFetched() {
  if (cachedOverrides !== null) return;
  if (fetchPromise) return;

  const preferredLanguage = getStoredLanguage();

  fetchPromise = translationsApi
    .getByName(preferredLanguage)
    .then((data) => {
      cachedOverrides = data;
      cachedLanguageName = preferredLanguage;
      notifyListeners();
    })
    .catch(() => {
      cachedOverrides = {};
      cachedLanguageName = preferredLanguage;
      notifyListeners();
    });
}

function ensureLanguagesFetched() {
  if (cachedAvailableLanguages !== null) return;
  if (languagesFetchPromise) return;

  languagesFetchPromise = translationsApi
    .getLanguages()
    .then((langs) => {
      cachedAvailableLanguages = langs;
      notifyListeners();
    })
    .catch(() => {
      cachedAvailableLanguages = ["default"];
      notifyListeners();
    });
}

export function useTranslation() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const cb = () => setTick((n) => n + 1);
    listeners.add(cb);
    ensureFetched();
    ensureLanguagesFetched();
    return () => {
      listeners.delete(cb);
    };
  }, []);

  function t(key: string, params?: Record<string, string>): string {
    const overrides = cachedOverrides ?? {};
    let value = overrides[key] ?? defaultTranslations[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        value = value.replace(`{${k}}`, v);
      }
    }
    return value;
  }

  function setLanguage(name: string) {
    if (typeof window !== "undefined") {
      localStorage.setItem(LANGUAGE_KEY, name);
    }
    cachedOverrides = null;
    cachedLanguageName = null;
    fetchPromise = null;
    ensureFetched();
    notifyListeners();
  }

  return {
    t,
    currentLanguage: cachedLanguageName ?? getStoredLanguage(),
    availableLanguages: cachedAvailableLanguages ?? [],
    setLanguage,
  };
}
