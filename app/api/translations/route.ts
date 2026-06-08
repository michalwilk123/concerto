import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";
import { defaultLocale } from "@/i18n/config";
import {
  getAllForAdmin,
  getMessages,
  saveAll,
  type LocaleEntry,
} from "@/lib/services/translation-service";

export const dynamic = "force-dynamic";

const localeCodePattern = /^[a-z]{2,10}$/;

function normalizeEntry(entry: Partial<LocaleEntry>): LocaleEntry {
  return {
    code: (entry.code ?? "").trim().toLowerCase(),
    label: (entry.label ?? "").trim(),
    isDefault: Boolean(entry.isDefault),
    enabled: entry.enabled ?? true,
    rtl: entry.rtl ?? false,
    overrides: entry.overrides ?? {},
  };
}

function validate(locales: LocaleEntry[]): string | null {
  if (locales.length === 0) return "At least one locale is required";

  const codes = new Set<string>();
  let defaultCount = 0;

  for (const locale of locales) {
    if (!localeCodePattern.test(locale.code)) {
      return `Invalid locale code "${locale.code}". Use 2-10 lowercase letters.`;
    }
    if (codes.has(locale.code)) return `Locale code "${locale.code}" is duplicated.`;
    codes.add(locale.code);
    if (!locale.label) return `Locale "${locale.code}" must have a label.`;
    if (locale.isDefault) {
      defaultCount += 1;
      if (locale.code !== defaultLocale) {
        return `The default locale code must remain "${defaultLocale}".`;
      }
    }
  }

  if (defaultCount !== 1) return "Exactly one default locale is required.";
  return null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const locale = url.searchParams.get("locale");

  if (locale !== null) {
    // Merged messages for a single locale.
    return NextResponse.json(await getMessages(locale.trim().toLowerCase()));
  }

  // Full locale data for the admin panel.
  return NextResponse.json(await getAllForAdmin());
}

export async function PUT(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = (await req.json()) as { locales?: Partial<LocaleEntry>[] };
  const locales = (body.locales ?? []).map(normalizeEntry);

  const validationError = validate(locales);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  await saveAll(locales);
  return NextResponse.json({ ok: true });
}
