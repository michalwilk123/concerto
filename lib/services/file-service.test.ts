import assert from "node:assert/strict";
import { test } from "bun:test";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { file as fileTable, folder as folderTable, group } from "@/db/schema";
import { deleteObjects, listObjects, objectExists, putObject } from "@/lib/s3-client";
import { moveFileById, renameFileById, uploadGroupFile } from "./file-service";

function uniqueId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function createGroup(groupId: string) {
  await db.insert(group).values({ id: groupId, name: `Test group ${groupId}` }).onConflictDoNothing();
}

async function createFolder(groupId: string, folderId: string) {
  await db.insert(folderTable).values({ id: folderId, name: folderId, groupId, parentId: null }).onConflictDoNothing();
}

async function cleanup(groupId: string) {
  const prefix = `${groupId}/`;
  const objects = await listObjects(prefix);
  if (objects.length > 0) await deleteObjects(objects.map((o) => o.key));
  // DB cascades on group delete
  await db.delete(group).where(eq(group.id, groupId));
}

async function seedFile(groupId: string, filename: string, folderId?: string): Promise<string> {
  const key = folderId ? `${groupId}/${folderId}/${filename}` : `${groupId}/${filename}`;
  const content = Buffer.from(`content of ${filename}`);
  await putObject(key, content, "text/plain");
  await db.insert(fileTable).values({
    id: key,
    name: filename,
    mimeType: "text/plain",
    size: content.length,
    groupId,
    folderId: folderId ?? null,
    uploadedById: null,
  }).onConflictDoNothing();
  return key;
}

// ─── renameFileById ───────────────────────────────────────────────────────────

test("renameFileById: renames file in S3 and updates DB record", async () => {
  const groupId = uniqueId("ren-ok");
  await createGroup(groupId);
  const originalKey = await seedFile(groupId, "original.txt");
  const nextKey = `${groupId}/renamed.txt`;

  try {
    const result = await renameFileById(originalKey, "renamed.txt");

    assert.ok(result);
    assert.equal(result.id, nextKey);
    assert.equal(result.name, "renamed.txt");
    assert.equal(result.groupId, groupId);
    assert.equal(result.folderId, null);

    // S3
    assert.equal(await objectExists(nextKey), true, "new key should exist in S3");
    assert.equal(await objectExists(originalKey), false, "old key should be gone from S3");

    // DB
    const [newRow] = await db.select().from(fileTable).where(eq(fileTable.id, nextKey)).limit(1);
    assert.ok(newRow, "new DB record should exist");
    assert.equal(newRow.name, "renamed.txt");

    const [oldRow] = await db.select().from(fileTable).where(eq(fileTable.id, originalKey)).limit(1);
    assert.equal(oldRow, undefined, "old DB record should be gone");
  } finally {
    await cleanup(groupId);
  }
});

test("renameFileById: renames file inside a folder", async () => {
  const groupId = uniqueId("ren-folder");
  await createGroup(groupId);
  const folderId = uniqueId("fold");
  await createFolder(groupId, folderId);
  const originalKey = await seedFile(groupId, "file.txt", folderId);
  const nextKey = `${groupId}/${folderId}/renamed.txt`;

  try {
    const result = await renameFileById(originalKey, "renamed.txt");

    assert.ok(result);
    assert.equal(result.id, nextKey);
    assert.equal(result.folderId, folderId);

    assert.equal(await objectExists(nextKey), true);
    assert.equal(await objectExists(originalKey), false);

    const [row] = await db.select().from(fileTable).where(eq(fileTable.id, nextKey)).limit(1);
    assert.ok(row);
    assert.equal(row.folderId, folderId);
  } finally {
    await cleanup(groupId);
  }
});

test("renameFileById: same name is a no-op (returns updated metadata, no move)", async () => {
  const groupId = uniqueId("ren-noop");
  await createGroup(groupId);
  const key = await seedFile(groupId, "same.txt");

  try {
    const result = await renameFileById(key, "same.txt");

    assert.ok(result);
    assert.equal(result.id, key);
    assert.equal(result.name, "same.txt");

    assert.equal(await objectExists(key), true);

    const [row] = await db.select().from(fileTable).where(eq(fileTable.id, key)).limit(1);
    assert.ok(row);
  } finally {
    await cleanup(groupId);
  }
});

test("renameFileById: rejects when target name already exists (collision)", async () => {
  const groupId = uniqueId("ren-col");
  await createGroup(groupId);
  await seedFile(groupId, "source.txt");
  await seedFile(groupId, "taken.txt");

  try {
    await assert.rejects(
      () => renameFileById(`${groupId}/source.txt`, "taken.txt"),
      /already exists/,
    );

    // Both files should be untouched in S3
    assert.equal(await objectExists(`${groupId}/source.txt`), true);
    assert.equal(await objectExists(`${groupId}/taken.txt`), true);

    // Source DB record should be untouched
    const [src] = await db.select().from(fileTable).where(eq(fileTable.id, `${groupId}/source.txt`)).limit(1);
    assert.ok(src, "source DB record should still exist");
  } finally {
    await cleanup(groupId);
  }
});

test("renameFileById: returns null for an invalid file ID (too short)", async () => {
  const result = await renameFileById("bad", "anything.txt");
  assert.equal(result, null);
});

// ─── moveFileById ─────────────────────────────────────────────────────────────

test("moveFileById: moves file to a folder and updates DB", async () => {
  const groupId = uniqueId("mov-folder");
  await createGroup(groupId);
  const folderId = uniqueId("fold");
  await createFolder(groupId, folderId);
  const srcKey = await seedFile(groupId, "file.txt");
  const destKey = `${groupId}/${folderId}/file.txt`;

  try {
    const result = await moveFileById(srcKey, folderId);

    assert.equal(result.id, destKey);
    assert.equal(result.folderId, folderId);
    assert.equal(result.name, "file.txt");

    assert.equal(await objectExists(destKey), true);
    assert.equal(await objectExists(srcKey), false);

    const [row] = await db.select().from(fileTable).where(eq(fileTable.id, destKey)).limit(1);
    assert.ok(row);
    assert.equal(row.folderId, folderId);
  } finally {
    await cleanup(groupId);
  }
});

test("moveFileById: moves file from folder to root and updates DB", async () => {
  const groupId = uniqueId("mov-root");
  await createGroup(groupId);
  const folderId = uniqueId("fold");
  await createFolder(groupId, folderId);
  const srcKey = await seedFile(groupId, "file.txt", folderId);
  const destKey = `${groupId}/file.txt`;

  try {
    const result = await moveFileById(srcKey, null);

    assert.equal(result.id, destKey);
    assert.equal(result.folderId, null);

    assert.equal(await objectExists(destKey), true);
    assert.equal(await objectExists(srcKey), false);

    const [row] = await db.select().from(fileTable).where(eq(fileTable.id, destKey)).limit(1);
    assert.ok(row);
    assert.equal(row.folderId, null);
  } finally {
    await cleanup(groupId);
  }
});

test("moveFileById: rejects when a file with the same name already exists at the destination (collision)", async () => {
  const groupId = uniqueId("mov-col");
  await createGroup(groupId);
  const folderId = uniqueId("fold");
  await createFolder(groupId, folderId);
  await seedFile(groupId, "file.txt");            // source at root
  await seedFile(groupId, "file.txt", folderId);  // existing file at destination

  try {
    await assert.rejects(
      () => moveFileById(`${groupId}/file.txt`, folderId),
      /already exists/,
    );

    assert.equal(await objectExists(`${groupId}/file.txt`), true);
    assert.equal(await objectExists(`${groupId}/${folderId}/file.txt`), true);
  } finally {
    await cleanup(groupId);
  }
});

test("moveFileById: same location is a no-op", async () => {
  const groupId = uniqueId("mov-noop");
  await createGroup(groupId);
  const key = await seedFile(groupId, "file.txt");

  try {
    const result = await moveFileById(key, null);
    assert.equal(result.id, key);
    assert.equal(await objectExists(key), true);
  } finally {
    await cleanup(groupId);
  }
});

// ─── uploadGroupFile ──────────────────────────────────────────────────────────

test("uploadGroupFile: stores file in S3 and creates DB record with uploadedById", async () => {
  const groupId = uniqueId("upl-track");
  await createGroup(groupId);
  const fileObj = new File([Buffer.from("hello world")], "hello.txt", { type: "text/plain" });

  try {
    // uploadedById is nullable (no FK violation with null)
    const result = await uploadGroupFile({ file: fileObj, groupId, uploadedById: null });

    const expectedKey = `${groupId}/hello.txt`;
    assert.equal(result.id, expectedKey);
    assert.equal(result.uploadedById, null);

    assert.equal(await objectExists(expectedKey), true);

    const [row] = await db.select().from(fileTable).where(eq(fileTable.id, expectedKey)).limit(1);
    assert.ok(row, "DB record should be created");
    assert.equal(row.groupId, groupId);
    assert.equal(row.name, "hello.txt");
  } finally {
    await cleanup(groupId);
  }
});

test("uploadGroupFile: rejects duplicate filename with 'already exists' error", async () => {
  const groupId = uniqueId("upl-dup");
  await createGroup(groupId);
  const fileObj = () => new File([Buffer.from("data")], "dup.txt", { type: "text/plain" });

  try {
    await uploadGroupFile({ file: fileObj(), groupId });

    await assert.rejects(
      () => uploadGroupFile({ file: fileObj(), groupId }),
      /already exists/,
    );
  } finally {
    await cleanup(groupId);
  }
});
