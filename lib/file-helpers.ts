import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { folder } from "@/db/schema";

export async function getMeetingsFolderId(userId: string): Promise<string | null> {
	const result = await db
		.select({ id: folder.id })
		.from(folder)
		.where(and(eq(folder.ownerId, userId), eq(folder.isSystem, true), eq(folder.name, "meetings")))
		.limit(1);

	return result[0]?.id ?? null;
}

export function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function sanitizeFileName(name: string): string {
	return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export function validateFileSize(size: number): boolean {
	return size <= MAX_FILE_SIZE;
}
