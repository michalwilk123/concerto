import { sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { getSessionOrNull } from "@/lib/auth-helpers";

/**
 * Resolve a path of folder names (e.g. ["meetings", "2024-01-15"]) to a folder ID + ancestors.
 * Each name is unique within its parent directory.
 */
export async function POST(req: NextRequest) {
  const session = await getSessionOrNull();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const { groupId, path } = body as { groupId: string; path: string[] };

  if (!groupId || !Array.isArray(path) || path.length === 0) {
    return NextResponse.json({ error: "groupId and non-empty path required" }, { status: 400 });
  }

  interface FolderRow {
    id: string;
    name: string;
    groupId: string;
    parentId: string | null;
    isSystem: boolean | null;
    createdAt: string | null;
  }

  const ancestors: FolderRow[] = [];
  let parentId: string | null = null;

  for (const name of path) {
    const condition = parentId === null ? sql`parent_id IS NULL` : sql`parent_id = ${parentId}`;

    const results = await db.execute(sql`
			SELECT id, name, group_id AS "groupId", parent_id AS "parentId",
				   is_system AS "isSystem", created_at AS "createdAt"
			FROM folder
			WHERE group_id = ${groupId} AND name = ${name} AND ${condition}
			LIMIT 1
		`);

    const found = Array.from(results)[0] as unknown as FolderRow | undefined;
    if (!found) {
      return NextResponse.json({ error: `Folder "${name}" not found` }, { status: 404 });
    }

    ancestors.push(found);
    parentId = found.id;
  }

  return NextResponse.json({
    folderId: parentId,
    ancestors,
  });
}
