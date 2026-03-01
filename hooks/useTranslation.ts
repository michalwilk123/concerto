"use client";

import { useEffect, useState } from "react";
import { translationsApi } from "@/lib/api-client";
import { defaultTranslations } from "@/lib/translations";

// Module-level cache — fetched once, shared across all hook instances
let cachedOverrides: Record<string, string> | null = null;
let fetchPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function notifyListeners() {
  for (const cb of listeners) cb();
}

export function invalidateTranslationCache() {
  cachedOverrides = null;
  fetchPromise = null;
  notifyListeners();
}

function ensureFetched() {
  if (cachedOverrides !== null) return;
  if (fetchPromise) return;

  fetchPromise = translationsApi
    .get()
    .then((data) => {
      cachedOverrides = data;
      notifyListeners();
    })
    .catch(() => {
      cachedOverrides = {};
      notifyListeners();
    });
}

export function useTranslation() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const cb = () => setTick((n) => n + 1);
    listeners.add(cb);
    ensureFetched();
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

  return { t };
}
