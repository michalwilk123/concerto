import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { meeting } from "@/db/schema";
import { requireGroupTeacher } from "@/lib/auth-helpers";

export async function DELETE(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;

	const [row] = await db.select().from(meeting).where(eq(meeting.id, id)).limit(1);
	if (!row) {
		return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
	}

	const { error } = await requireGroupTeacher(row.groupId);
	if (error) return error;

	await db.delete(meeting).where(eq(meeting.id, id));

	return NextResponse.json({ success: true });
}
