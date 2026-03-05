import { and, eq, isNull, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { folder } from "@/db/schema";
import { requireGroupTeacher } from "@/lib/auth-helpers";
import { moveFileById, parseFileId } from "@/lib/services/file-service";

interface BulkItem {
  type: "file" | "folder";
  id: string;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const items: BulkItem[] = body?.items ?? [];
  const targetFolderId: string | null = body?.targetFolderId ?? null;

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items is required" }, { status: 400 });
  }

  // Determine groupId from first item
  let groupId: string | null = null;
  for (const item of items) {
    if (item.type === "file") {
      const parsed = parseFileId(item.id);
      if (parsed) { groupId = parsed.groupId; break; }
    } else {
      const [f] = await db.select({ groupId: folder.groupId }).from(folder).where(eq(folder.id, item.id)).limit(1);
      if (f) { groupId = f.groupId; break; }
    }
  }

  if (!groupId) return NextResponse.json({ error: "Could not determine group" }, { status: 400 });

  const { error } = await requireGroupTeacher(groupId);
  if (error) return error;

  const moved: string[] = [];
  const errors: { id: string; error: string }[] = [];

  for (const item of items) {
    try {
      if (item.type === "file") {
        await moveFileById(item.id, targetFolderId);
        moved.push(item.id);
      } else {
        // Move folder: update parentId with safety checks
        const [f] = await db.select().from(folder).where(eq(folder.id, item.id)).limit(1);
        if (!f) { errors.push({ id: item.id, error: "Folder not found" }); continue; }
        if (f.isSystem) { errors.push({ id: item.id, error: "Cannot move system folder" }); continue; }

        // Circular reference check
        if (targetFolderId) {
          const descendants = await db.execute(sql`
            WITH RECURSIVE desc_chain AS (
              SELECT id FROM folder WHERE parent_id = ${item.id}
              UNION ALL
              SELECT f.id FROM folder f JOIN desc_chain d ON f.parent_id = d.id
            )
            SELECT id FROM desc_chain WHERE id = ${targetFolderId}
          `);
          if (Array.from(descendants).length > 0) {
            errors.push({ id: item.id, error: "Cannot move folder into its own descendant" });
            continue;
          }
        }

        // Name collision check at target parent
        const collision = await db
          .select({ id: folder.id })
          .from(folder)
          .where(
            and(
              eq(folder.groupId, f.groupId),
              eq(folder.name, f.name),
              targetFolderId ? eq(folder.parentId, targetFolderId) : isNull(folder.parentId),
            ),
          )
          .limit(1);
        if (collision.some((r) => r.id !== item.id)) {
          errors.push({ id: item.id, error: "A folder with this name already exists here" });
          continue;
        }

        await db.update(folder).set({ parentId: targetFolderId }).where(eq(folder.id, item.id));
        moved.push(item.id);
      }
    } catch (err) {
      errors.push({ id: item.id, error: err instanceof Error ? err.message : "Move failed" });
    }
  }

  return NextResponse.json({ moved, errors });
}
