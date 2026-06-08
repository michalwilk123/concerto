import { readFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { language as languageTable, translation as translationTable } from "@/db/schema";
import { defaultLocale } from "@/i18n/config";
import { defaultTranslations } from "@/lib/translations";

interface LegacyLocale {
  code: string;
  label: string;
  isDefault?: boolean;
  overrides?: Record<string, string>;
}

const TRANSLATIONS_FILE = path.join(process.cwd(), "data", "translations.json");

async function loadLegacy(): Promise<LegacyLocale[]> {
  try {
    const raw = await readFile(TRANSLATIONS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.locales)) return parsed.locales as LegacyLocale[];
  } catch {
    // No file — fall through to a bare English default.
  }
  return [{ code: defaultLocale, label: "English", isDefault: true, overrides: {} }];
}

async function main() {
  let locales = await loadLegacy();

  // Guarantee a single English default exists.
  if (!locales.some((l) => l.code === defaultLocale)) {
    locales.unshift({ code: defaultLocale, label: "English", isDefault: true, overrides: {} });
  }

  for (const locale of locales) {
    const code = locale.code.trim().toLowerCase();
    const isDefault = code === defaultLocale;

    await db
      .insert(languageTable)
      .values({
        code,
        label: locale.label || code,
        isDefault,
        enabled: true,
        rtl: false,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: languageTable.code,
        set: { label: locale.label || code, isDefault, updatedAt: new Date() },
      });

    // Replace overrides for this language.
    await db.delete(translationTable).where(eq(translationTable.languageCode, code));
    const rows = Object.entries(locale.overrides ?? {})
      .filter(([key, value]) => value !== "" && value !== defaultTranslations[key])
      .map(([key, value]) => ({ id: nanoid(), languageCode: code, key, value }));
    if (rows.length > 0) await db.insert(translationTable).values(rows);

    console.log(`seeded ${code} (${rows.length} overrides)${isDefault ? " [default]" : ""}`);
  }

  console.log("translation seed complete");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
