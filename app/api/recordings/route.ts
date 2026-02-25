import { eq, inArray } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { meeting, meetingSession } from "@/db/schema";
import { requireGroupMember } from "@/lib/auth-helpers";
import { listRecordings } from "@/lib/realtimekit";
import type { Recording } from "@/types/recording";

export async function GET(request: NextRequest) {
	const groupId = request.nextUrl.searchParams.get("groupId");
	if (!groupId) {
		return NextResponse.json({ error: "groupId is required" }, { status: 400 });
	}

	const { error } = await requireGroupMember(groupId);
	if (error) return error;

	try {
		console.log("[recordings] Fetching from RTK...");
		const rtkRecordings = await listRecordings();
		console.log(
			"[recordings] RTK returned",
			rtkRecordings.length,
			"recordings, sample:",
			JSON.stringify(rtkRecordings[0] ?? null),
		);

		// Look up meeting names from DB via meeting_session join
		const rtkMeetingIds = [...new Set(rtkRecordings.map((r) => r.meeting_id))];
		let meetingMap = new Map<string, { id: string; name: string; groupId: string }>();
		if (rtkMeetingIds.length > 0) {
			try {
				const rows = await db
					.select({
						rtkId: meetingSession.id,
						name: meeting.name,
						groupId: meeting.groupId,
					})
					.from(meetingSession)
					.innerJoin(meeting, eq(meeting.id, meetingSession.meetingId))
					.where(inArray(meetingSession.id, rtkMeetingIds));
				meetingMap = new Map(
					rows.map((r) => [r.rtkId, { id: r.rtkId, name: r.name, groupId: r.groupId }]),
				);
			} catch {
				console.warn("[recordings] Could not query meeting tables, showing all recordings");
			}
		}

		// Only include recordings whose meeting belongs to this group,
		// or recordings from unknown meetings (created before tracking).
		const recordings: Recording[] = rtkRecordings
			.filter((rec) => {
				const m = meetingMap.get(rec.meeting_id);
				// Include if: meeting belongs to this group, OR meeting is unknown (not in DB)
				return !m || m.groupId === groupId;
			})
			.map((rec) => ({
				id: rec.id,
				name: rec.output_file_name,
				meetingName: meetingMap.get(rec.meeting_id)?.name ?? "Unknown meeting",
				size: rec.file_size,
				lastModified: rec.stopped_time,
				url: rec.download_url,
				duration: rec.recording_duration,
			}));

		// Sort newest first
		recordings.sort(
			(a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime(),
		);

		return NextResponse.json(recordings);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		console.error("Failed to list recordings:", message);
		return NextResponse.json({ error: `Failed to list recordings: ${message}` }, { status: 500 });
	}
}
