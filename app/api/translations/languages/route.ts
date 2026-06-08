import { NextResponse } from "next/server";
import { getActiveLanguages } from "@/lib/services/translation-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const languages = await getActiveLanguages();
  return NextResponse.json({
    locales: languages.map((l) => ({
      code: l.code,
      label: l.label,
      isDefault: l.isDefault,
    })),
  });
}
