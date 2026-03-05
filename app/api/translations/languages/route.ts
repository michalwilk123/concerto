import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const DATA_DIR = path.join(process.cwd(), "data");
const TRANSLATIONS_FILE = path.join(DATA_DIR, "translations.json");

export async function GET() {
  try {
    const raw = await readFile(TRANSLATIONS_FILE, "utf-8");
    const parsed = JSON.parse(raw);

    if (!parsed.translations) {
      return NextResponse.json({ languages: ["default"] });
    }

    const languages = (parsed.translations as { name: string }[]).map((ts) => ts.name);
    return NextResponse.json({ languages });
  } catch {
    return NextResponse.json({ languages: ["default"] });
  }
}
