import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { user } from "@/db/schema";
import { requireAuth } from "@/lib/auth-helpers";

/**
 * Self-service account deletion (App Store Guideline 5.1.1(v)).
 * The authenticated user permanently deletes their own account. Deleting the
 * user row cascades to session/account/groupMember/chat rows (see db/schema.ts),
 * which removes auth credentials and invalidates every active token.
 */
export async function DELETE() {
  const { error, session } = await requireAuth();
  if (error) return error;

  const [deleted] = await db
    .delete(user)
    .where(eq(user.id, session.user.id))
    .returning({ id: user.id });

  if (!deleted) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
