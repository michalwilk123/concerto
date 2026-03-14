import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { group, groupMember } from "@/db/schema";
import { requireAuth } from "@/lib/auth-helpers";
import { getSessionFromRequest } from "../auth";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  const { error, session: validated } = await requireAuth(session);
  if (error) return error;

  const groups = await db
    .select({ id: group.id, name: group.name, createdAt: group.createdAt })
    .from(groupMember)
    .innerJoin(group, eq(groupMember.groupId, group.id))
    .where(eq(groupMember.userId, validated.user.id));

  return NextResponse.json(groups);
}
