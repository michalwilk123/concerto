import { type NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { requireGroupMember } from "@/lib/auth-helpers";
import { db } from "@/db";
import { folder } from "@/db/schema";
import { getSessionFromRequest } from "../../../auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const session = await getSessionFromRequest(req);
  const { error } = await requireGroupMember(groupId, session);
  if (error) return error;

  const parentId = req.nextUrl.searchParams.get("parentId") || null;

  const folders = await db
    .select()
    .from(folder)
    .where(
      and(
        eq(folder.groupId, groupId),
        parentId ? eq(folder.parentId, parentId) : isNull(folder.parentId),
        isNull(folder.meetingId),
      )
    );

  return NextResponse.json(folders);
}
