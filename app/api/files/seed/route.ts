import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { file, folder } from "@/db/schema";
import { requireAdmin } from "@/lib/auth-helpers";
import { sanitizeFileName } from "@/lib/file-helpers";

const SEED_FILES = [
	{ name: "Lenna.png", mimeType: "image/png" },
	{ name: "wilhelm.wav", mimeType: "audio/wav" },
	{ name: "zen_of_python.txt", mimeType: "text/plain" },
];

export async function POST() {
	const { error, session } = await requireAdmin();
	if (error) return error;

	const userId = session?.user.id;

	// Create meetings folder if not exists
	const existing = await db
		.select()
		.from(folder)
		.where(and(eq(folder.ownerId, userId), eq(folder.isSystem, true), eq(folder.name, "meetings")))
		.limit(1);

	let meetingsFolderId: string;
	if (existing.length > 0) {
		meetingsFolderId = existing[0].id;
	} else {
		meetingsFolderId = crypto.randomUUID();
		await db.insert(folder).values({
			id: meetingsFolderId,
			name: "meetings",
			ownerId: userId,
			parentId: null,
			isSystem: true,
		});
	}

	// Check if seed files already exist (by checking if any files exist at root level)
	const existingFiles = await db.select().from(file).where(eq(file.ownerId, userId)).limit(1);

	if (existingFiles.length > 0) {
		return NextResponse.json({ message: "Already seeded", meetingsFolderId });
	}

	// Copy seed files
	const uploadDir = path.join(process.cwd(), "uploads", userId);
	await mkdir(uploadDir, { recursive: true });

	for (const seedFile of SEED_FILES) {
		const seedPath = path.join(process.cwd(), "public", "seed-files", seedFile.name);
		try {
			const buffer = await readFile(seedPath);
			const fileId = crypto.randomUUID();
			const safeName = sanitizeFileName(seedFile.name);
			const storagePath = `${userId}/${fileId}-${safeName}`;
			const fullPath = path.join(process.cwd(), "uploads", storagePath);

			await writeFile(fullPath, buffer);

			const fileStats = await stat(seedPath);
			await db.insert(file).values({
				id: fileId,
				name: seedFile.name,
				mimeType: seedFile.mimeType,
				size: fileStats.size,
				storagePath,
				ownerId: userId,
				folderId: null,
			});
		} catch (err) {
			console.error(`Failed to seed ${seedFile.name}:`, err);
		}
	}

	return NextResponse.json({ message: "Seeded successfully", meetingsFolderId });
}
