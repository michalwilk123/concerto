import { eq } from "drizzle-orm";
import { unstable_cache, revalidateTag } from "next/cache";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { language as languageTable, translation as translationTable } from "@/db/schema";
import { defaultLocale } from "@/i18n/config";
import { defaultTranslations } from "@/lib/translations";

export const TRANSLATIONS_TAG = "translations";

export interface AppLanguage {
  code: string;
  label: string;
  isDefault: boolean;
  enabled: boolean;
  rtl: boolean;
}

export interface LocaleEntry {
  code: string;
  label: string;
  isDefault: boolean;
  enabled: boolean;
  rtl: boolean;
  overrides: Record<string, string>;
}

const FALLBACK_LANGUAGE: AppLanguage = {
  code: defaultLocale,
  label: "English",
  isDefault: true,
  enabled: true,
  rtl: false,
};

/**
 * Enabled languages for the UI switcher. Cached in the Next data cache and
 * invalidated via revalidateTag(TRANSLATIONS_TAG) on every admin save.
 */
export const getActiveLanguages = unstable_cache(
  async (): Promise<AppLanguage[]> => {
    const rows = await db
      .select()
      .from(languageTable)
      .where(eq(languageTable.enabled, true));

    if (rows.length === 0) return [FALLBACK_LANGUAGE];

    return rows
      .map((r) => ({
        code: r.code,
        label: r.label,
        isDefault: r.isDefault,
        enabled: r.enabled,
        rtl: r.rtl,
      }))
      .sort((a, b) => (a.isDefault ? -1 : b.isDefault ? 1 : a.code.localeCompare(b.code)));
  },
  ["active-languages"],
  { tags: [TRANSLATIONS_TAG] },
);

/**
 * Flat message dictionary for a locale: English defaults overlaid with the
 * locale's DB overrides. Per-code cached (the `code` arg is part of the key).
 */
export const getMessages = unstable_cache(
  async (code: string): Promise<Record<string, string>> => {
    const rows = await db
      .select({ key: translationTable.key, value: translationTable.value })
      .from(translationTable)
      .where(eq(translationTable.languageCode, code));

    const overrides: Record<string, string> = {};
    for (const row of rows) overrides[row.key] = row.value;

    return { ...defaultTranslations, ...overrides };
  },
  ["translation-messages"],
  { tags: [TRANSLATIONS_TAG] },
);

/** Full language list with overrides, for the admin panel. Not cached (admin-only, always fresh). */
export async function getAllForAdmin(): Promise<{ locales: LocaleEntry[] }> {
  const langs = await db.select().from(languageTable);
  const allTranslations = await db.select().from(translationTable);

  const overridesByCode = new Map<string, Record<string, string>>();
  for (const t of allTranslations) {
    const map = overridesByCode.get(t.languageCode) ?? {};
    map[t.key] = t.value;
    overridesByCode.set(t.languageCode, map);
  }

  if (langs.length === 0) {
    return {
      locales: [{ ...FALLBACK_LANGUAGE, overrides: {} }],
    };
  }

  const locales = langs
    .map((l) => ({
      code: l.code,
      label: l.label,
      isDefault: l.isDefault,
      enabled: l.enabled,
      rtl: l.rtl,
      overrides: overridesByCode.get(l.code) ?? {},
    }))
    .sort((a, b) => (a.isDefault ? -1 : b.isDefault ? 1 : a.code.localeCompare(b.code)));

  return { locales };
}

/**
 * Persist the full set of languages + overrides, then bust the cache.
 * Replaces translations per-language wholesale (simple and safe at this scale).
 */
export async function saveAll(locales: LocaleEntry[]): Promise<void> {
  const keepCodes = new Set(locales.map((l) => l.code));

  await db.transaction(async (tx) => {
    // Drop languages that no longer exist (cascade removes their translations).
    const existing = await tx.select({ code: languageTable.code }).from(languageTable);
    for (const { code } of existing) {
      if (!keepCodes.has(code)) {
        await tx.delete(languageTable).where(eq(languageTable.code, code));
      }
    }

    for (const locale of locales) {
      await tx
        .insert(languageTable)
        .values({
          code: locale.code,
          label: locale.label,
          isDefault: locale.isDefault,
          enabled: locale.enabled,
          rtl: locale.rtl,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: languageTable.code,
          set: {
            label: locale.label,
            isDefault: locale.isDefault,
            enabled: locale.enabled,
            rtl: locale.rtl,
            updatedAt: new Date(),
          },
        });

      // Replace this language's overrides wholesale.
      await tx.delete(translationTable).where(eq(translationTable.languageCode, locale.code));
      const rows = Object.entries(locale.overrides)
        .filter(([key, value]) => value !== "" && value !== defaultTranslations[key])
        .map(([key, value]) => ({
          id: nanoid(),
          languageCode: locale.code,
          key,
          value,
        }));
      if (rows.length > 0) await tx.insert(translationTable).values(rows);
    }
  });

  revalidateTag(TRANSLATIONS_TAG);
}
