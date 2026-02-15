import { and, eq, isNull } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { folder } from "@/db/schema";
import { getSessionOrNull, requireAdmin } from "@/lib/auth-helpers";
import { rooms } from "@/lib/room-store";

export async function POST(req: NextRequest) {
	const { error, session } = await requireAdmin();
	if (error) return error;

	const { name, parentId } = await req.json();

	if (!name || typeof name !== "string" || !name.trim()) {
		return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
	}

	const folderId = crypto.randomUUID();
	const [inserted] = await db
		.insert(folder)
		.values({
			id: folderId,
			name: name.trim(),
			ownerId: session?.user.id,
			parentId: parentId || null,
			isSystem: false,
		})
		.returning();

	return NextResponse.json(inserted);
}

export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url);
	const parentId = searchParams.get("parentId");

	// Try admin first
	const { error, session } = await requireAdmin();
	if (!error) {
		const userId = session?.user.id;
		const whereClause = parentId
			? and(eq(folder.ownerId, userId), eq(folder.parentId, parentId))
			: and(eq(folder.ownerId, userId), isNull(folder.parentId));

		const folders = await db.select().from(folder).where(whereClause);
		return NextResponse.json(folders);
	}

	// Fall back to meeting participant - only show meetings folder
	const sess = await getSessionOrNull();
	if (!sess) {
		return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
	}

	// Find creator's meetings folder if participant is in a room
	let creatorUserId: string | null = null;
	for (const [, room] of rooms) {
		const participantName = sess.user.name;
		if (
			room.creatorUserId !== sess.user.id &&
			(room.moderators.has(participantName) || room.students.has(participantName))
		) {
			creatorUserId = room.creatorUserId;
			break;
		}
	}

	if (!creatorUserId) {
		return NextResponse.json([]);
	}

	// Only return the meetings folder for participants
	const meetingsFolders = await db
		.select()
		.from(folder)
		.where(
			and(
				eq(folder.ownerId, creatorUserId),
				eq(folder.isSystem, true),
				eq(folder.name, "meetings"),
			),
		);

	return NextResponse.json(meetingsFolders);
}
