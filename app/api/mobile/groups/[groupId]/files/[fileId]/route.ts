import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { file as fileTable } from "@/db/schema";
import { requireGroupMember } from "@/lib/auth-helpers";
import { readFileById } from "@/lib/services/file-service";
import { getSessionFromRequest } from "../../../../auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string; fileId: string }> },
) {
  const { groupId, fileId } = await params;
  const session = await getSessionFromRequest(req);
  const { error } = await requireGroupMember(groupId, session);
  if (error) return error;

  // Verify the file belongs to this group
  const decodedFileId = decodeURIComponent(fileId);
  const [fileRow] = await db
    .select({ groupId: fileTable.groupId })
    .from(fileTable)
    .where(eq(fileTable.id, decodedFileId))
    .limit(1);

  if (!fileRow || fileRow.groupId !== groupId) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const result = await readFileById(decodedFileId);
  if (!result) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(result.buffer), {
    headers: {
      "Content-Type": result.mimeType,
      "Content-Disposition": `attachment; filename="${result.filename}"`,
    },
  });
}
