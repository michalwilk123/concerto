import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { group, groupMember } from "@/db/schema";
import { auth } from "./auth";

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

// The default ("Welcome") onboarding group is read-only for everyone except
// system admins. Returns true when the group is the default one.
async function isDefaultGroup(groupId: string) {
  const [row] = await db
    .select({ isDefault: group.isDefault })
    .from(group)
    .where(eq(group.id, groupId))
    .limit(1);
  return Boolean(row?.isDefault);
}

function defaultGroupReadOnlyError() {
  return {
    error: NextResponse.json({ error: "Only admins can modify this group" }, { status: 403 }),
    session: null,
  };
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

  // Past this point the user is a non-admin: the default group is read-only.
  if (await isDefaultGroup(groupId)) {
    return defaultGroupReadOnlyError();
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

// Write access for routes where any group member may normally write (e.g. file
// uploads). Same as requireGroupMember for normal groups, but the default group
// stays admin-only.
export async function requireGroupUploadAccess(groupId: string, existingSession?: AuthSession) {
  const session = existingSession ?? (await getSessionOrNull());
  const validated = validateSession(session);
  if (validated.error) {
    return validated;
  }

  if (validated.session.user.role === "admin") {
    return validated;
  }

  if (await isDefaultGroup(groupId)) {
    return defaultGroupReadOnlyError();
  }

  return requireGroupMember(groupId, validated.session);
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
