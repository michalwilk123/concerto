/**
 * Backfill script: scan S3 and insert DB records for files without a DB entry.
 * Run with: bun run db/backfill-files.ts
 */
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { group, file as fileTable } from "@/db/schema";
import { getMimeFromExtension } from "@/lib/file-helpers";
import { listObjects } from "@/lib/s3-client";

async function main() {
  const groups = await db.select({ id: group.id, name: group.name }).from(group);
  console.log(`Found ${groups.length} groups`);

  let total = 0;

  for (const g of groups) {
    const prefix = `${g.id}/`;
    const objects = await listObjects(prefix);
    let count = 0;

    for (const obj of objects) {
      const relative = obj.key.slice(prefix.length);
      const parts = relative.split("/").filter(Boolean);
      if (parts.length === 0) continue;

      const [existing] = await db
        .select({ id: fileTable.id })
        .from(fileTable)
        .where(eq(fileTable.id, obj.key))
        .limit(1);

      if (!existing) {
        const filename = parts[parts.length - 1];
        const folderId = parts.length > 1 ? parts[0] : null;
        await db.insert(fileTable).values({
          id: obj.key,
          name: filename,
          mimeType: getMimeFromExtension(filename),
          size: obj.size,
          groupId: g.id,
          folderId,
          uploadedById: null,
          createdAt: obj.lastModified,
        }).onConflictDoNothing();
        count++;
      }
    }

    console.log(`Group ${g.name} (${g.id}): backfilled ${count} files`);
    total += count;
  }

  console.log(`Done. Backfilled ${total} files total.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
