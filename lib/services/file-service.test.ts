import assert from "node:assert/strict";
import test from "node:test";
import { deleteObjects, listObjects, objectExists, putObject } from "@/lib/s3-client";
import { renameFileById } from "./file-service";

function uniqueGroupId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function cleanup(prefix: string) {
  const objects = await listObjects(prefix);
  if (objects.length > 0) await deleteObjects(objects.map((o) => o.key));
}

test("file service: renameFileById renames file and returns updated metadata", async () => {
  const groupId = uniqueGroupId("rename-ok");
  const originalName = "original.txt";
  const nextName = "renamed.txt";
  const originalKey = `${groupId}/${originalName}`;
  const nextKey = `${groupId}/${nextName}`;

  await putObject(originalKey, Buffer.from("hello"), "text/plain");

  try {
    const renamed = await renameFileById(originalKey, nextName);

    assert.ok(renamed);
    assert.equal(renamed.id, nextKey);
    assert.equal(renamed.name, nextName);
    assert.equal(renamed.groupId, groupId);
    assert.equal(renamed.folderId, null);
    assert.equal(renamed.mimeType, "text/plain");

    assert.equal(await objectExists(nextKey), true);
    assert.equal(await objectExists(originalKey), false);
  } finally {
    await cleanup(`${groupId}/`);
  }
});

test("file service: renameFileById rejects duplicate target filename in same directory", async () => {
  const groupId = uniqueGroupId("rename-dup");
  const sourceName = "source.txt";
  const takenName = "taken.txt";

  await putObject(`${groupId}/${sourceName}`, Buffer.from("source"), "text/plain");
  await putObject(`${groupId}/${takenName}`, Buffer.from("taken"), "text/plain");

  try {
    await assert.rejects(
      () => renameFileById(`${groupId}/${sourceName}`, takenName),
      /already exists/,
    );

    assert.equal(await objectExists(`${groupId}/${sourceName}`), true);
    assert.equal(await objectExists(`${groupId}/${takenName}`), true);
  } finally {
    await cleanup(`${groupId}/`);
  }
});
