import { and, eq, isNull } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { file, folder } from "@/db/schema";
import { getSessionOrNull, requireAdmin } from "@/lib/auth-helpers";
import { rooms } from "@/lib/room-store";

export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url);
	const folderId = searchParams.get("folderId");
	const meetingView = searchParams.get("meetingView");

	// Meeting participant view - find admin's meetings folder
	if (meetingView === "true") {
		const session = await getSessionOrNull();
		if (!session) {
			return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
		}

		// Find a room where requester is a participant and get the creator's meetings folder
		let creatorUserId: string | null = null;
		for (const [, room] of rooms) {
			const participantName = session.user.name;
			if (
				room.creatorUserId !== session.user.id &&
				(room.moderators.has(participantName) || room.students.has(participantName))
			) {
				creatorUserId = room.creatorUserId;
				break;
			}
		}

		if (!creatorUserId) {
			return NextResponse.json([]);
		}

		// Find the admin's meetings folder
		const meetingsFolder = await db
			.select()
			.from(folder)
			.where(
				and(
					eq(folder.ownerId, creatorUserId),
					eq(folder.isSystem, true),
					eq(folder.name, "meetings"),
				),
			)
			.limit(1);

		if (meetingsFolder.length === 0) {
			return NextResponse.json([]);
		}

		const files = await db
			.select()
			.from(file)
			.where(and(eq(file.ownerId, creatorUserId), eq(file.folderId, meetingsFolder[0].id)));

		return NextResponse.json(files.map((f) => ({ ...f, url: `/api/files/${f.id}` })));
	}

	// Admin view
	const { error, session } = await requireAdmin();
	if (error) return error;

	const userId = session?.user.id;
	const whereClause = folderId
		? and(eq(file.ownerId, userId), eq(file.folderId, folderId))
		: and(eq(file.ownerId, userId), isNull(file.folderId));

	const files = await db.select().from(file).where(whereClause);

	return NextResponse.json(files.map((f) => ({ ...f, url: `/api/files/${f.id}` })));
}
