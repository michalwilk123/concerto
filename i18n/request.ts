import { getRequestConfig } from "next-intl/server";
import { defaultLocale, getSupportedLocaleLabel, normalizeSupportedLocaleCode } from "./config";
import { defaultTranslations } from "@/lib/translations";

interface LocaleEntry {
  code: string;
  label: string;
  isDefault: boolean;
  overrides: Record<string, string>;
}

interface TranslationsFile {
  locales: LocaleEntry[];
}

function normalizeLocaleEntry(entry: LocaleEntry): LocaleEntry {
  return {
    ...entry,
    code: normalizeSupportedLocaleCode(entry.code),
    label: entry.label || getSupportedLocaleLabel(entry.code),
  };
}

async function loadTranslations(): Promise<TranslationsFile> {
  try {
    const fs = await import("fs/promises");
    const path = await import("path");
    const filePath = path.join(process.cwd(), "data", "translations.json");
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed.locales) {
      return {
        locales: parsed.locales.map(normalizeLocaleEntry),
      };
    }
    // Legacy format migration
    if (parsed.translations) {
      return {
        locales: parsed.translations.map((t: { name: string; overrides: Record<string, string> }, i: number) => ({
          code: normalizeSupportedLocaleCode(
            t.name === "default" ? defaultLocale : t.name === "polski" ? "pl" : t.name,
          ),
          label: t.name === "default" ? "English" : t.name === "polski" ? "Polski" : getSupportedLocaleLabel(t.name),
          isDefault: i === 0,
          overrides: t.overrides,
        })),
      };
    }
    return { locales: [{ code: defaultLocale, label: "English", isDefault: true, overrides: {} }] };
  } catch {
    return { locales: [{ code: defaultLocale, label: "English", isDefault: true, overrides: {} }] };
  }
}

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = normalizeSupportedLocaleCode((await requestLocale) ?? defaultLocale);

  const data = await loadTranslations();
  const entry = data.locales.find((l) => l.code === locale);
  const defaultEntry = data.locales.find((l) => l.isDefault) ?? data.locales[0];

  // Merge: defaults ← locale overrides
  const overrides = entry?.overrides ?? defaultEntry?.overrides ?? {};
  const flat = { ...defaultTranslations, ...overrides };

  // Convert flat dot-separated keys to nested object for next-intl
  const messages: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split(".");
    let current: Record<string, unknown> = messages;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current) || typeof current[parts[i]] !== "object") {
        current[parts[i]] = {};
      }
      current = current[parts[i]] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]] = value;
  }

  return {
    locale,
    messages,
  };
});
