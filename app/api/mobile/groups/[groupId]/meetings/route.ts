import { desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { meeting } from "@/db/schema";
import { requireGroupMember } from "@/lib/auth-helpers";
import { getSessionFromRequest } from "../../../auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const session = await getSessionFromRequest(req);
  const { error } = await requireGroupMember(groupId, session);
  if (error) return error;

  const meetings = await db
    .select()
    .from(meeting)
    .where(eq(meeting.groupId, groupId))
    .orderBy(desc(meeting.createdAt));

  return NextResponse.json(meetings);
}
