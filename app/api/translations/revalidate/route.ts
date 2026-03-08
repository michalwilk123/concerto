import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-helpers";

export async function POST() {
  const { error } = await requireAdmin();
  if (error) return error;

  revalidateTag("translations");
  return NextResponse.json({ ok: true });
}
