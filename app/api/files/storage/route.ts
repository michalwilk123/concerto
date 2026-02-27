import { eq, sum } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { file } from "@/db/schema";
import { requireGroupMember } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId");

  if (!groupId) {
    return NextResponse.json({ error: "groupId is required" }, { status: 400 });
  }

  const { error } = await requireGroupMember(groupId);
  if (error) return error;

  const [result] = await db
    .select({ totalBytes: sum(file.size) })
    .from(file)
    .where(eq(file.groupId, groupId));

  return NextResponse.json({ totalBytes: Number(result?.totalBytes ?? 0) });
}
