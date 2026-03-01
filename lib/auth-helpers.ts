import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { groupMember } from "@/db/schema";
import { auth } from "./auth";

const INACTIVE_ACCOUNT_MESSAGE = "Account is awaiting activation";

export async function getSessionOrNull() {
  try {
    const h = await headers();
    return await auth.api.getSession({ headers: h });
  } catch (e) {
    console.error("getSessionOrNull error:", e);
    return null;
  }
}

export async function requireAuth() {
  const session = await getSessionOrNull();

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

export async function requireAdmin() {
  const session = await getSessionOrNull();

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

  if (session.user.role !== "admin") {
    return {
      error: NextResponse.json({ error: "Admin access required" }, { status: 403 }),
      session: null,
    };
  }

  return { error: null, session };
}

export async function requireGroupTeacher(groupId: string) {
  const session = await getSessionOrNull();

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

  // Admin can do anything
  if (session.user.role === "admin") {
    return { error: null, session };
  }

  const [member] = await db
    .select()
    .from(groupMember)
    .where(and(eq(groupMember.groupId, groupId), eq(groupMember.userId, session.user.id)))
    .limit(1);

  if (!member || member.role !== "teacher") {
    return {
      error: NextResponse.json({ error: "Group teacher access required" }, { status: 403 }),
      session: null,
    };
  }

  return { error: null, session };
}

export async function requireGroupMember(groupId: string) {
  const session = await getSessionOrNull();

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

  // Admin can access everything
  if (session.user.role === "admin") {
    return { error: null, session };
  }

  const [member] = await db
    .select()
    .from(groupMember)
    .where(and(eq(groupMember.groupId, groupId), eq(groupMember.userId, session.user.id)))
    .limit(1);

  if (!member) {
    return {
      error: NextResponse.json({ error: "Group membership required" }, { status: 403 }),
      session: null,
    };
  }

  return { error: null, session };
}
