import { nanoid } from "nanoid";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { folder } from "@/db/schema";

/**
 * Ensures the system "meetings" folder exists for a group, creating it if needed.
 * Returns the meetings folder ID.
 */
export async function ensureMeetingsFolder(groupId: string): Promise<string> {
	const existing = await db
		.select({ id: folder.id })
		.from(folder)
		.where(and(eq(folder.groupId, groupId), eq(folder.isSystem, true), eq(folder.name, "meetings")))
		.limit(1);

	if (existing.length > 0) return existing[0].id;

	const id = nanoid();
	await db.insert(folder).values({
		id,
		name: "meetings",
		groupId,
		parentId: null,
		isSystem: true,
	});
	return id;
}

/**
 * Ensures a meeting subfolder exists inside the group's meetings folder.
 * Creates the meetings folder + meeting subfolder if they don't exist.
 * Returns the meeting subfolder ID.
 */
export async function ensureMeetingFolder(groupId: string, meetingName: string): Promise<string> {
	const meetingsFolderId = await ensureMeetingsFolder(groupId);

	// Check if a subfolder for this meeting already exists
	const existing = await db
		.select({ id: folder.id })
		.from(folder)
		.where(and(eq(folder.groupId, groupId), eq(folder.parentId, meetingsFolderId), eq(folder.name, meetingName)))
		.limit(1);

	if (existing.length > 0) return existing[0].id;

	const id = nanoid();
	await db.insert(folder).values({
		id,
		name: meetingName,
		groupId,
		parentId: meetingsFolderId,
		isSystem: false,
	});
	return id;
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
