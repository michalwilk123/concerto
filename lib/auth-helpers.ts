import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { groupMember } from "@/db/schema";
import { auth } from "./auth";

const INACTIVE_ACCOUNT_MESSAGE = "Account is awaiting activation";
type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;

export async function getSessionOrNull() {
  try {
    const h = await headers();
    return await auth.api.getSession({ headers: h });
  } catch (e) {
    console.error("getSessionOrNull error:", e);
    return null;
  }
}

function validateSession(session: AuthSession) {
  if (!session) {
    return {
      error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }),
      session: null,
    };
  }

  if (!session.user.isActive) {
    return {
      error: NextResponse.json({ error: INACTIVE_ACCOUNT_MESSAGE }, { status: 403 }),
      session: null,
    };
  }

  return { error: null, session };
}

export async function requireAuth(existingSession?: AuthSession) {
  const session = existingSession ?? (await getSessionOrNull());
  return validateSession(session);
}

export async function requireAdmin() {
  const session = await getSessionOrNull();
  const validated = validateSession(session);
  if (validated.error) {
    return validated;
  }

  if (validated.session.user.role !== "admin") {
    return {
      error: NextResponse.json({ error: "Admin access required" }, { status: 403 }),
      session: null,
    };
  }

  return validated;
}

export async function requireGroupTeacher(groupId: string, existingSession?: AuthSession) {
  const session = existingSession ?? (await getSessionOrNull());
  const validated = validateSession(session);
  if (validated.error) {
    return validated;
  }

  // Admin can do anything
  if (validated.session.user.role === "admin") {
    return validated;
  }

  const [member] = await db
    .select()
    .from(groupMember)
    .where(and(eq(groupMember.groupId, groupId), eq(groupMember.userId, validated.session.user.id)))
    .limit(1);

  if (!member || member.role !== "teacher") {
    return {
      error: NextResponse.json({ error: "Group teacher access required" }, { status: 403 }),
      session: null,
    };
  }

  return validated;
}

export async function requireGroupMember(groupId: string, existingSession?: AuthSession) {
  const session = existingSession ?? (await getSessionOrNull());
  const validated = validateSession(session);
  if (validated.error) {
    return validated;
  }

  // Admin can access everything
  if (validated.session.user.role === "admin") {
    return validated;
  }

  const [member] = await db
    .select()
    .from(groupMember)
    .where(and(eq(groupMember.groupId, groupId), eq(groupMember.userId, validated.session.user.id)))
    .limit(1);

  if (!member) {
    return {
      error: NextResponse.json({ error: "Group membership required" }, { status: 403 }),
      session: null,
    };
  }

  return validated;
}
