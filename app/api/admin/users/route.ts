import { asc, desc, ilike, or, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/auth-helpers";
import { eq } from "drizzle-orm";

const SORTABLE_COLUMNS = {
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
  isActive: user.isActive,
} as const;

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 20));
  const search = url.searchParams.get("search")?.trim() || "";
  const sortBy = url.searchParams.get("sortBy") || "createdAt";
  const sortDir = url.searchParams.get("sortDir") || "desc";

  const offset = (page - 1) * limit;

  const whereClause = search
    ? or(ilike(user.name, `%${search}%`), ilike(user.email, `%${search}%`))
    : undefined;

  const column = SORTABLE_COLUMNS[sortBy as keyof typeof SORTABLE_COLUMNS] ?? user.createdAt;
  const orderFn = sortDir === "asc" ? asc : desc;

  const [users, countResult] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        banned: user.banned,
        banReason: user.banReason,
        isActive: user.isActive,
        createdAt: user.createdAt,
        image: user.image,
      })
      .from(user)
      .where(whereClause)
      .orderBy(orderFn(column))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(user).where(whereClause),
  ]);

  return NextResponse.json({
    users,
    total: Number(countResult[0].count),
    page,
    limit,
  });
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const { name, email, password, role, isActive } = body;

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Name, email, and password are required" }, { status: 400 });
  }

  const validRoles = ["admin", "teacher", "student"];
  const finalRole = validRoles.includes(role) ? role : "student";

  try {
    const res = await auth.api.signUpEmail({
      body: { email, password, name },
    });

    if (!res.user) {
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }

    const [updated] = await db
      .update(user)
      .set({
        role: finalRole,
        isActive: isActive !== false,
        updatedAt: new Date(),
      })
      .where(eq(user.id, res.user.id))
      .returning({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        banned: user.banned,
        banReason: user.banReason,
        isActive: user.isActive,
        createdAt: user.createdAt,
        image: user.image,
      });

    return NextResponse.json(updated, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create user";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
