import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { defaultLocale, getSupportedLocaleLabel, normalizeSupportedLocaleCode } from "@/i18n/config";

export const dynamic = "force-dynamic";

const DATA_DIR = path.join(process.cwd(), "data");
const TRANSLATIONS_FILE = path.join(DATA_DIR, "translations.json");

export async function GET() {
  try {
    const raw = await readFile(TRANSLATIONS_FILE, "utf-8");
    const parsed = JSON.parse(raw);

    if (parsed.locales) {
      const locales = parsed.locales.map((l: { code: string; label: string; isDefault: boolean }) => ({
        code: normalizeSupportedLocaleCode(l.code),
        label: l.label || getSupportedLocaleLabel(l.code),
        isDefault: l.isDefault,
      }));
      return NextResponse.json({ locales });
    }

    // Legacy format fallback
    if (parsed.translations) {
      const locales = parsed.translations.map(
        (t: { name: string }, i: number) => ({
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
        }),
      );
      return NextResponse.json({ locales });
    }

    return NextResponse.json({ locales: [{ code: defaultLocale, label: "English", isDefault: true }] });
  } catch {
    return NextResponse.json({ locales: [{ code: defaultLocale, label: "English", isDefault: true }] });
  }
}
