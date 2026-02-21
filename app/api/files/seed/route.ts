import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { file } from "@/db/schema";
import { requireGroupTeacher } from "@/lib/auth-helpers";
import { ensureMeetingsFolder, sanitizeFileName } from "@/lib/file-helpers";

const SEED_FILES = [
	{ name: "Lenna.png", mimeType: "image/png" },
	{ name: "wilhelm.wav", mimeType: "audio/wav" },
	{ name: "zen_of_python.txt", mimeType: "text/plain" },
];

export async function POST(req: NextRequest) {
	const body = await req.json().catch(() => ({}));
	const groupId = body.groupId;

	if (!groupId) {
		return NextResponse.json({ error: "groupId is required" }, { status: 400 });
	}

	const { error, session } = await requireGroupTeacher(groupId);
	if (error) return error;

	const userId = session?.user.id;

	// Ensure meetings folder exists (shared helper)
	const meetingsFolderId = await ensureMeetingsFolder(groupId);

	// Check if seed files already exist for this group
	const existingFiles = await db.select().from(file).where(eq(file.groupId, groupId)).limit(1);

	if (existingFiles.length > 0) {
		return NextResponse.json({ message: "Already seeded", meetingsFolderId });
	}

	// Copy seed files
	const uploadDir = path.join(process.cwd(), "uploads", groupId);
	await mkdir(uploadDir, { recursive: true });

	for (const seedFile of SEED_FILES) {
		const seedPath = path.join(process.cwd(), "public", "seed-files", seedFile.name);
		try {
			const buffer = await readFile(seedPath);
			const fileId = nanoid();
			const safeName = sanitizeFileName(seedFile.name);
			const storagePath = `${groupId}/${fileId}-${safeName}`;
			const fullPath = path.join(process.cwd(), "uploads", storagePath);

			await writeFile(fullPath, buffer);

			const fileStats = await stat(seedPath);
			await db.insert(file).values({
				id: fileId,
				name: seedFile.name,
				mimeType: seedFile.mimeType,
				size: fileStats.size,
				storagePath,
				groupId,
				uploadedById: userId,
				folderId: null,
			});
		} catch (err) {
			console.error(`Failed to seed ${seedFile.name}:`, err);
		}
	}

	return NextResponse.json({ message: "Seeded successfully", meetingsFolderId });
}
