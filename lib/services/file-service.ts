import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { file as fileTable, user } from "@/db/schema";
import { getMimeFromExtension, sanitizeFileName, validateFileSize } from "@/lib/file-helpers";
import {
  copyObject,
  deleteObject,
  getObject,
  headObject,
  listObjects,
  objectExists,
  putObject,
} from "@/lib/s3-client";
import type { FileWithUrl } from "@/types/files";

export interface ParsedFileId {
  fileId: string;
  filename: string;
  groupId: string;
}

function s3Key(groupId: string, folderId: string | null | undefined, filename: string): string {
  return folderId ? `${groupId}/${folderId}/${filename}` : `${groupId}/${filename}`;
}

function fileUrl(id: string): string {
  return `/api/files?id=${encodeURIComponent(id)}`;
}

export async function listGroupFiles(params: {
  groupId: string;
  folderId?: string | null;
}): Promise<FileWithUrl[]> {
  const whereClause = params.folderId
    ? and(eq(fileTable.groupId, params.groupId), eq(fileTable.folderId, params.folderId))
    : and(eq(fileTable.groupId, params.groupId), isNull(fileTable.folderId));

  const rows = await db
    .select({
      id: fileTable.id,
      name: fileTable.name,
      mimeType: fileTable.mimeType,
      size: fileTable.size,
      groupId: fileTable.groupId,
      folderId: fileTable.folderId,
      uploadedById: fileTable.uploadedById,
      createdAt: fileTable.createdAt,
      uploadedByName: user.name,
    })
    .from(fileTable)
    .leftJoin(user, eq(fileTable.uploadedById, user.id))
    .where(whereClause);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    mimeType: row.mimeType,
    size: row.size,
    groupId: row.groupId,
    folderId: row.folderId ?? null,
    uploadedById: row.uploadedById ?? null,
    uploadedByName: row.uploadedByName ?? null,
    createdAt: row.createdAt.toISOString(),
    url: fileUrl(row.id),
  }));
}

export async function uploadGroupFile(params: {
  file: File;
  groupId: string;
  folderId?: string | null;
  uploadedById?: string | null;
}): Promise<FileWithUrl> {
  if (!validateFileSize(params.file.size)) throw new Error("File too large (max 50MB)");

  const safeName = sanitizeFileName(params.file.name);
  const key = s3Key(params.groupId, params.folderId, safeName);

  if (await objectExists(key)) {
    throw new Error("A file with this name already exists");
  }

  const buffer = Buffer.from(await params.file.arrayBuffer());
  const contentType = getMimeFromExtension(safeName);
  await putObject(key, buffer, contentType);

  await db.insert(fileTable).values({
    id: key,
    name: safeName,
    mimeType: contentType,
    size: buffer.length,
    groupId: params.groupId,
    folderId: params.folderId || null,
    uploadedById: params.uploadedById || null,
  });

  return {
    id: key,
    name: safeName,
    mimeType: contentType,
    size: buffer.length,
    groupId: params.groupId,
    folderId: params.folderId || null,
    uploadedById: params.uploadedById || null,
    uploadedByName: null,
    createdAt: new Date().toISOString(),
    url: fileUrl(key),
  };
}

export function parseFileId(fileId: string): ParsedFileId | null {
  const segments = fileId.split("/").filter(Boolean);
  if (segments.length < 2) return null;
  return {
    fileId,
    filename: segments[segments.length - 1],
    groupId: segments[0],
  };
}

export async function readFileById(
  fileId: string,
): Promise<{ buffer: Buffer; filename: string; mimeType: string } | null> {
  const parsed = parseFileId(fileId);
  if (!parsed) return null;
  try {
    const buffer = await getObject(fileId);
    return { buffer, filename: parsed.filename, mimeType: getMimeFromExtension(parsed.filename) };
  } catch {
    return null;
  }
}

export async function deleteFileById(fileId: string): Promise<boolean> {
  const parsed = parseFileId(fileId);
  if (!parsed) return false;
  try {
    await deleteObject(fileId);
  } catch {
    // ignore S3 errors
  }
  await db.delete(fileTable).where(eq(fileTable.id, fileId));
  return true;
}

export async function renameFileById(fileId: string, newName: string): Promise<FileWithUrl | null> {
  const parsed = parseFileId(fileId);
  if (!parsed) return null;

  const safeName = sanitizeFileName(newName.trim());
  if (!safeName) throw new Error("File name is required");

  const idSegments = parsed.fileId.split("/").filter(Boolean);
  idSegments[idSegments.length - 1] = safeName;
  const nextId = idSegments.join("/");

  if (nextId !== fileId) {
    if (await objectExists(nextId)) {
      throw new Error("A file with this name already exists");
    }
    await copyObject(fileId, nextId);
    await deleteObject(fileId);
  }

  const head = await headObject(nextId);
  if (!head) throw new Error("File not found");

  await db.update(fileTable).set({ id: nextId, name: safeName }).where(eq(fileTable.id, fileId));

  return {
    id: nextId,
    name: safeName,
    mimeType: getMimeFromExtension(safeName),
    size: head.size,
    groupId: parsed.groupId,
    folderId: idSegments.length > 2 ? idSegments[1] : null,
    uploadedById: null,
    uploadedByName: null,
    createdAt: head.lastModified.toISOString(),
    url: fileUrl(nextId),
  };
}

export async function moveFileById(
  fileId: string,
  targetFolderId: string | null,
): Promise<FileWithUrl> {
  const parsed = parseFileId(fileId);
  if (!parsed) throw new Error("Invalid file ID");

  const { groupId, filename } = parsed;
  const newId = s3Key(groupId, targetFolderId, filename);

  if (newId !== fileId) {
    if (await objectExists(newId)) {
      throw new Error("A file with this name already exists in the target folder");
    }
    await copyObject(fileId, newId);
    await deleteObject(fileId);
    await db.update(fileTable).set({ id: newId, folderId: targetFolderId }).where(eq(fileTable.id, fileId));
  }

  const head = await headObject(newId);
  if (!head) throw new Error("File not found after move");

  return {
    id: newId,
    name: filename,
    mimeType: getMimeFromExtension(filename),
    size: head.size,
    groupId,
    folderId: targetFolderId,
    uploadedById: null,
    uploadedByName: null,
    createdAt: head.lastModified.toISOString(),
    url: fileUrl(newId),
  };
}

// Backfill: scan S3 and insert DB records for files without a DB entry
export async function backfillFilesFromS3(groupId: string): Promise<number> {
  const prefix = `${groupId}/`;
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
        groupId,
        folderId,
        uploadedById: null,
        createdAt: obj.lastModified,
      }).onConflictDoNothing();
      count++;
    }
  }

  return count;
}
