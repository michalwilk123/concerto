import { and, eq, isNull } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { file } from "@/db/schema";
import { requireGroupMember } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId");
  const folderId = searchParams.get("folderId");

  if (!groupId) {
    return NextResponse.json({ error: "groupId is required" }, { status: 400 });
  }

  const { error } = await requireGroupMember(groupId);
  if (error) return error;

  const whereClause = folderId
    ? and(eq(file.groupId, groupId), eq(file.folderId, folderId))
    : and(eq(file.groupId, groupId), isNull(file.folderId));

  const files = await db.select().from(file).where(whereClause);

  console.log(
    `[files/list] groupId=${groupId}, folderId=${folderId ?? "ROOT"} → ${files.length} files: ${files.map((f) => `${f.name}(id=${f.id},folder=${f.folderId ?? "ROOT"})`).join(", ") || "none"}`,
  );

  return NextResponse.json(files.map((f) => ({ ...f, url: `/api/files/${f.id}` })));
}
