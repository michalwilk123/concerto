import { mkdir, readdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { getMimeFromExtension, sanitizeFileName, validateFileSize } from "@/lib/file-helpers";
import type { FileWithUrl } from "@/types/files";

export interface ParsedFileId {
  fileId: string;
  filename: string;
  fsPath: string;
  groupId: string;
}

const UPLOADS_BASE = path.join(process.cwd(), "uploads");

function groupDir(groupId: string, folderId?: string | null): string {
  return folderId
    ? path.join(UPLOADS_BASE, groupId, folderId)
    : path.join(UPLOADS_BASE, groupId);
}

async function listFilesInDir(dirPath: string): Promise<{ name: string; size: number; mtime: Date }[]> {
  try {
    const entries = await readdir(dirPath);
    const files: { name: string; size: number; mtime: Date }[] = [];
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry);
      try {
        const s = await stat(fullPath);
        if (s.isFile()) files.push({ name: entry, size: s.size, mtime: s.mtime });
      } catch { /* ignore */ }
    }
    return files;
  } catch {
    return [];
  }
}

function fileUrl(id: string): string {
  return `/api/files?id=${encodeURIComponent(id)}`;
}

export async function listGroupFiles(params: {
  groupId: string;
  folderId?: string | null;
}): Promise<FileWithUrl[]> {
  const dir = groupDir(params.groupId, params.folderId);
  const entries = await listFilesInDir(dir);
  return entries.map((entry) => {
    const id = params.folderId
      ? `${params.groupId}/${params.folderId}/${entry.name}`
      : `${params.groupId}/${entry.name}`;
    return {
      id,
      name: entry.name,
      mimeType: getMimeFromExtension(entry.name),
      size: entry.size,
      groupId: params.groupId,
      folderId: params.folderId || null,
      createdAt: entry.mtime.toISOString(),
      url: fileUrl(id),
    };
  });
}

export async function uploadGroupFile(params: {
  file: File;
  groupId: string;
  folderId?: string | null;
}): Promise<FileWithUrl> {
  if (!validateFileSize(params.file.size)) throw new Error("File too large (max 50MB)");

  const safeName = sanitizeFileName(params.file.name);
  const dir = groupDir(params.groupId, params.folderId);
  await mkdir(dir, { recursive: true });
  const fullPath = path.join(dir, safeName);
  try {
    // Prevent silent overwrite when the same filename is uploaded twice.
    await writeFile(fullPath, Buffer.from(await params.file.arrayBuffer()), { flag: "wx" });
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? error.code : null;
    if (code === "EEXIST") {
      throw new Error("A file with this name already exists");
    }
    throw error;
  }

  const s = await stat(fullPath);
  const id = params.folderId
    ? `${params.groupId}/${params.folderId}/${safeName}`
    : `${params.groupId}/${safeName}`;
  return {
    id,
    name: safeName,
    mimeType: getMimeFromExtension(safeName),
    size: s.size,
    groupId: params.groupId,
    folderId: params.folderId || null,
    createdAt: s.mtime.toISOString(),
    url: fileUrl(id),
  };
}

export function parseFileId(fileId: string): ParsedFileId | null {
  const segments = fileId.split("/").filter(Boolean);
  if (segments.length < 2) return null;
  return {
    fileId,
    filename: segments[segments.length - 1],
    fsPath: path.join(UPLOADS_BASE, fileId),
    groupId: segments[0],
  };
}

export async function readFileById(fileId: string): Promise<{ buffer: Buffer; filename: string; mimeType: string } | null> {
  const parsed = parseFileId(fileId);
  if (!parsed) return null;
  try {
    const buffer = await readFile(parsed.fsPath);
    return { buffer, filename: parsed.filename, mimeType: getMimeFromExtension(parsed.filename) };
  } catch {
    return null;
  }
}

export async function deleteFileById(fileId: string): Promise<boolean> {
  const parsed = parseFileId(fileId);
  if (!parsed) return false;
  try {
    await unlink(parsed.fsPath);
    return true;
  } catch {
    return false;
  }
}
