import { sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { getSessionOrNull } from "@/lib/auth-helpers";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionOrNull();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const ancestors = await db.execute(sql`
		WITH RECURSIVE chain AS (
			SELECT id, name, group_id, parent_id, is_system, created_at, 0 AS depth
			FROM folder
			WHERE id = ${id}
			UNION ALL
			SELECT f.id, f.name, f.group_id, f.parent_id, f.is_system, f.created_at, c.depth + 1
			FROM folder f
			JOIN chain c ON f.id = c.parent_id
			WHERE c.depth < 50
		)
		SELECT id, name, group_id AS "groupId", parent_id AS "parentId",
			   is_system AS "isSystem", created_at AS "createdAt"
		FROM chain
		ORDER BY depth DESC
	`);

  return NextResponse.json(Array.from(ancestors));
}
