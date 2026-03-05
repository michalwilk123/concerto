import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";

const DATA_DIR = path.join(process.cwd(), "data");
const TRANSLATIONS_FILE = path.join(DATA_DIR, "translations.json");

interface TranslationSet {
  name: string;
  overrides: Record<string, string>;
}

interface TranslationsFile {
  translations: TranslationSet[];
}

async function readTranslations(): Promise<TranslationsFile> {
  try {
    const raw = await readFile(TRANSLATIONS_FILE, "utf-8");
    const parsed = JSON.parse(raw);

    // Migration: detect old flat format (Record<string, string>)
    if (!parsed.translations) {
      return { translations: [{ name: "default", overrides: parsed as Record<string, string> }] };
    }

    return parsed as TranslationsFile;
  } catch {
    return { translations: [{ name: "default", overrides: {} }] };
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const name = url.searchParams.get("name");

  const data = await readTranslations();

  if (name !== null) {
    // Return overrides for a specific language name (used by the hook)
    const set = data.translations.find((ts) => ts.name === name) ?? data.translations[0];
    return NextResponse.json(set?.overrides ?? {});
  }

  // Return all translation sets (used by admin panel)
  return NextResponse.json(data);
}

export async function PUT(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = (await req.json()) as { translations: TranslationSet[] };

  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(TRANSLATIONS_FILE, JSON.stringify(body, null, 2), "utf-8");

  return NextResponse.json({ ok: true });
}
