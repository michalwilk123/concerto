import { type NextRequest, NextResponse } from "next/server";
import { kickAllActiveSessionParticipants } from "@/lib/realtimekit";
import { rooms } from "@/lib/room-store";

const TEACHER_GRACE_PERIOD_MS = 15_000;

/** Find the DB meeting ID for a given RTK meeting ID by scanning rooms */
function findMeetingIdByRtkId(rtkMeetingId: string): string | undefined {
  for (const [meetingId, room] of rooms) {
    if (room.rtkMeetingId === rtkMeetingId) return meetingId;
  }
  return undefined;
}

export async function POST(request: NextRequest) {
  try {
    const event = await request.json();
    console.log(
      `[webhook] Received event: ${event.event}, rtkMeetingId: ${event.meeting?.id ?? "NONE"}`,
    );

    const rtkMeetingId = event.meeting?.id;
    if (!rtkMeetingId) {
      return new NextResponse(null, { status: 200 });
    }

    const meetingId = findMeetingIdByRtkId(rtkMeetingId);
    if (!meetingId) {
      return new NextResponse(null, { status: 200 });
    }

    const room = rooms.get(meetingId);
    if (!room) {
      return new NextResponse(null, { status: 200 });
    }

    if (event.event === "meeting.participantLeft") {
      const participantName = event.participant?.name;

      if (participantName) {
        const entry = room.participants.get(participantName);
        room.participants.delete(participantName);

        // If this was a teacher, remove from connectedTeachers
        if (entry?.role === "teacher" || room.connectedTeachers.has(participantName)) {
          room.connectedTeachers.delete(participantName);
          console.log(
            `[webhook] Teacher ${participantName} left meeting ${meetingId}, connectedTeachers=${room.connectedTeachers.size}`,
          );

          // If no teachers remain, start grace period
          if (room.connectedTeachers.size === 0) {
            console.log(
              `[webhook] No teachers left in meeting ${meetingId}, starting ${TEACHER_GRACE_PERIOD_MS / 1000}s grace period...`,
            );

            if (room.allTeachersLeftTimer) {
              clearTimeout(room.allTeachersLeftTimer);
            }

            room.allTeachersLeftTimer = setTimeout(async () => {
              room.allTeachersLeftTimer = undefined;
              console.log(
                `[webhook] Grace period expired for meeting ${meetingId}, kicking all participants...`,
              );

              // Kick all remaining participants
              if (room.rtkMeetingId) {
                await kickAllActiveSessionParticipants(room.rtkMeetingId);
              }

              // Clear waiting room
              room.waitingRoom.clear();
              room.participants.clear();
              rooms.delete(meetingId);

              console.log(`[webhook] Meeting ${meetingId} cleaned up after all teachers left`);
            }, TEACHER_GRACE_PERIOD_MS);
          }
        }
      }
    }

    if (event.event === "meeting.participantJoined") {
      const participantName = event.participant?.name;

      if (participantName) {
        const entry = room.participants.get(participantName);
        if (entry?.role === "teacher") {
          room.connectedTeachers.add(participantName);
          console.log(
            `[webhook] Teacher ${participantName} joined meeting ${meetingId}, cancelling grace timer`,
          );

          // Cancel grace period if a teacher rejoins
          if (room.allTeachersLeftTimer) {
            clearTimeout(room.allTeachersLeftTimer);
            room.allTeachersLeftTimer = undefined;
          }
        }
      }
    }
  } catch (err) {
    console.error("Webhook error:", err);
  }
  return new NextResponse(null, { status: 200 });
}
