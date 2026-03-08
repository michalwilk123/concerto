import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth-helpers";
import { defaultTranslations } from "@/lib/translations";
import {
  SUPPORTED_LOCALE_CODES,
  defaultLocale,
  getSupportedLocaleLabel,
  normalizeSupportedLocaleCode,
} from "@/i18n/config";

export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data");
const TRANSLATIONS_FILE = path.join(DATA_DIR, "translations.json");

interface LocaleEntry {
  code: string;
  label: string;
  isDefault: boolean;
  overrides: Record<string, string>;
}

interface TranslationsFile {
  locales: LocaleEntry[];
}

const localeCodePattern = /^[a-z]{2,10}$/;

function normalizeLocaleEntry(entry: LocaleEntry): LocaleEntry {
  return {
    ...entry,
    code: normalizeSupportedLocaleCode(entry.code),
    label: entry.label.trim() || getSupportedLocaleLabel(entry.code),
  };
}

function validateTranslationsFile(data: TranslationsFile): string | null {
  if (!Array.isArray(data.locales) || data.locales.length === 0) {
    return "At least one locale is required";
  }

  const normalized = data.locales.map(normalizeLocaleEntry);
  const codes = new Set<string>();
  let defaultCount = 0;

  for (const locale of normalized) {
    if (!localeCodePattern.test(locale.code)) {
      return `Invalid locale code "${locale.code}". Use 2-10 lowercase letters.`;
    }

    if (!SUPPORTED_LOCALE_CODES.has(locale.code)) {
      return `Locale code "${locale.code}" is not supported by the app routing.`;
    }

    if (codes.has(locale.code)) {
      return `Locale code "${locale.code}" is duplicated.`;
    }

    codes.add(locale.code);

    if (!locale.label) {
      return `Locale "${locale.code}" must have a label.`;
    }

    if (locale.isDefault) {
      defaultCount += 1;
      if (locale.code !== defaultLocale) {
        return `The default locale code must remain "${defaultLocale}".`;
      }
    }
  }

  if (defaultCount !== 1) {
    return "Exactly one default locale is required.";
  }

  return null;
}

async function readTranslations(): Promise<TranslationsFile> {
  try {
    const raw = await readFile(TRANSLATIONS_FILE, "utf-8");
    const parsed = JSON.parse(raw);

    // New format
    if (parsed.locales) {
      return {
        locales: parsed.locales.map(normalizeLocaleEntry),
      };
    }

    // Migration: old { translations: [{ name, overrides }] } format
    if (parsed.translations) {
      const migrated: TranslationsFile = {
        locales: parsed.translations.map(
          (t: { name: string; overrides: Record<string, string> }, i: number) => ({
            code: normalizeSupportedLocaleCode(
              t.name === "default" ? defaultLocale : t.name === "polski" ? "pl" : t.name,
            ),
            label:
              t.name === "default"
                ? "English"
                : t.name === "polski"
                  ? "Polski"
                  : getSupportedLocaleLabel(t.name),
            isDefault: i === 0,
            overrides: t.overrides,
          }),
        ),
      };
      // Auto-save migrated format
      await writeFile(TRANSLATIONS_FILE, JSON.stringify(migrated, null, 2), "utf-8");
      return migrated;
    }

    return { locales: [{ code: defaultLocale, label: "English", isDefault: true, overrides: {} }] };
  } catch {
    return { locales: [{ code: defaultLocale, label: "English", isDefault: true, overrides: {} }] };
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const locale = url.searchParams.get("locale");

  const data = await readTranslations();

  if (locale !== null) {
    // Return merged messages for a specific locale (used by the hook)
    const entry = data.locales.find((l) => l.code === normalizeSupportedLocaleCode(locale));
    const defaultEntry = data.locales.find((l) => l.isDefault) ?? data.locales[0];
    const overrides = entry?.overrides ?? defaultEntry?.overrides ?? {};
    return NextResponse.json({ ...defaultTranslations, ...overrides });
  }

  // Return all locale data (used by admin panel)
  return NextResponse.json(data);
}

export async function PUT(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = (await req.json()) as TranslationsFile;
  const normalizedBody: TranslationsFile = {
    locales: (body.locales ?? []).map(normalizeLocaleEntry),
  };
  const validationError = validateTranslationsFile(normalizedBody);

  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(TRANSLATIONS_FILE, JSON.stringify(normalizedBody, null, 2), "utf-8");

  revalidateTag("translations");

  return NextResponse.json({ ok: true });
}
