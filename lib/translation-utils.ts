import type { LocaleEntry } from "@/lib/api-client";
import { defaultTranslations } from "@/lib/translations";

const TOTAL_KEYS = Object.keys(defaultTranslations).length;

/**
 * Whether an override value counts as a "real" translation: non-empty and
 * different from the English source. Mirrors the save-time filter in
 * lib/services/translation-service.ts so the UI and DB agree on what's stored.
 */
export function isMeaningfulOverride(key: string, value: string | undefined): boolean {
  return value !== undefined && value !== "" && value !== defaultTranslations[key];
}

/**
 * Translation progress for a locale, 0–1. The default source language is always
 * complete; other locales are (meaningful overrides) / (total keys).
 */
export function computeProgress(locale: LocaleEntry): number {
  if (locale.isDefault) return 1;
  if (TOTAL_KEYS === 0) return 1;
  let done = 0;
  for (const [key, value] of Object.entries(locale.overrides)) {
    if (isMeaningfulOverride(key, value)) done += 1;
  }
  return Math.min(1, done / TOTAL_KEYS);
}

export function computeTranslationStats(locale: LocaleEntry): { translated: number; total: number } {
  if (locale.isDefault) return { translated: TOTAL_KEYS, total: TOTAL_KEYS };
  let translated = 0;
  for (const [key, value] of Object.entries(locale.overrides)) {
    if (isMeaningfulOverride(key, value)) translated += 1;
  }
  return { translated: Math.min(translated, TOTAL_KEYS), total: TOTAL_KEYS };
}

/**
 * Case-insensitive match against the English source, the current translation,
 * and the dotted key. Empty query matches everything.
 */
export function matchesSearch(
  key: string,
  source: string,
  translation: string,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    key.toLowerCase().includes(q) ||
    source.toLowerCase().includes(q) ||
    translation.toLowerCase().includes(q)
  );
}

export interface OverrideChange {
  key: string;
  /** English source text (the fallback). */
  source: string;
  /** New override value; empty string when cleared. */
  value: string;
  /** True when the user removed an existing translation (falls back to English). */
  cleared: boolean;
}

/**
 * Diff two override maps into a list of human-readable changes for the save
 * summary. Only keys whose stored value actually changed are returned.
 */
export function diffOverrides(
  original: Record<string, string>,
  current: Record<string, string>,
): OverrideChange[] {
  const keys = new Set([...Object.keys(original), ...Object.keys(current)]);
  const changes: OverrideChange[] = [];
  for (const key of keys) {
    const before = original[key] ?? "";
    const after = current[key] ?? "";
    if (before === after) continue;
    changes.push({
      key,
      source: defaultTranslations[key] ?? key,
      value: after,
      cleared: after === "",
    });
  }
  return changes;
}
