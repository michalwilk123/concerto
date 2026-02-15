import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { file } from "@/db/schema";
import { requireAdmin } from "@/lib/auth-helpers";
import { sanitizeFileName, validateFileSize } from "@/lib/file-helpers";

export async function POST(req: NextRequest) {
	const { error, session } = await requireAdmin();
	if (error) return error;

	const formData = await req.formData();
	const uploadedFile = formData.get("file") as File | null;
	const folderId = formData.get("folderId") as string | null;

	if (!uploadedFile) {
		return NextResponse.json({ error: "No file provided" }, { status: 400 });
	}

	if (!validateFileSize(uploadedFile.size)) {
		return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 400 });
	}

	const userId = session?.user.id;
	const fileId = crypto.randomUUID();
	const safeName = sanitizeFileName(uploadedFile.name);
	const storagePath = `${userId}/${fileId}-${safeName}`;
	const fullPath = path.join(process.cwd(), "uploads", storagePath);

	await mkdir(path.dirname(fullPath), { recursive: true });

	const buffer = Buffer.from(await uploadedFile.arrayBuffer());
	await writeFile(fullPath, buffer);

	const [inserted] = await db
		.insert(file)
		.values({
			id: fileId,
			name: uploadedFile.name,
			mimeType: uploadedFile.type || "application/octet-stream",
			size: uploadedFile.size,
			storagePath,
			ownerId: userId,
			folderId: folderId || null,
		})
		.returning();

	return NextResponse.json(inserted);
}
