import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { file, folder } from "@/db/schema";
import { getSessionOrNull, requireAdmin } from "@/lib/auth-helpers";
import { rooms } from "@/lib/room-store";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const session = await getSessionOrNull();
	if (!session) {
		return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
	}

	const [fileDoc] = await db.select().from(file).where(eq(file.id, id)).limit(1);
	if (!fileDoc) {
		return NextResponse.json({ error: "File not found" }, { status: 404 });
	}

	// Check access: owner OR meeting participant accessing meetings folder file
	const isOwner = fileDoc.ownerId === session.user.id;
	let hasAccess = isOwner;

	if (!hasAccess && fileDoc.folderId) {
		// Check if file is in a meetings folder
		const [fileFolder] = await db
			.select()
			.from(folder)
			.where(
				and(
					eq(folder.id, fileDoc.folderId),
					eq(folder.isSystem, true),
					eq(folder.name, "meetings"),
				),
			)
			.limit(1);

		if (fileFolder) {
			// Check if requester is in a room where the file owner is the creator
			for (const [, room] of rooms) {
				if (room.creatorUserId === fileDoc.ownerId) {
					const participantName = session.user.name;
					if (room.moderators.has(participantName) || room.students.has(participantName)) {
						hasAccess = true;
						break;
					}
				}
			}
		}
	}

	if (!hasAccess) {
		return NextResponse.json({ error: "Access denied" }, { status: 403 });
	}

	const fullPath = path.join(process.cwd(), "uploads", fileDoc.storagePath);

	try {
		const buffer = await readFile(fullPath);
		const download = new URL(req.url).searchParams.get("download") === "true";

		const headers: Record<string, string> = {
			"Content-Type": fileDoc.mimeType,
			"Content-Length": String(buffer.length),
		};

		if (download) {
			headers["Content-Disposition"] = `attachment; filename="${fileDoc.name}"`;
		} else {
			headers["Content-Disposition"] = `inline; filename="${fileDoc.name}"`;
		}

		return new NextResponse(buffer, { headers });
	} catch {
		return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
	}
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { error, session } = await requireAdmin();
	if (error) return error;

	const { id } = await params;

	const [fileDoc] = await db
		.select()
		.from(file)
		.where(and(eq(file.id, id), eq(file.ownerId, session?.user.id)))
		.limit(1);

	if (!fileDoc) {
		return NextResponse.json({ error: "File not found" }, { status: 404 });
	}

	// Delete from disk
	const fullPath = path.join(process.cwd(), "uploads", fileDoc.storagePath);
	try {
		await unlink(fullPath);
	} catch {
		// File may already be gone from disk
	}

	// Delete from DB
	await db.delete(file).where(eq(file.id, id));

	return NextResponse.json({ success: true });
}
