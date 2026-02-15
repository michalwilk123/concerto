import { type NextRequest, NextResponse } from "next/server";
import { getRoomOrFail } from "@/lib/api-helpers";

export async function POST(request: NextRequest) {
	const body = await request.json();
	const { roomKey, requestId } = body;

	const roomOrError = getRoomOrFail(roomKey);
	if (roomOrError instanceof NextResponse) return roomOrError;
	const room = roomOrError;

	const approvedToken = room.approvedTokens.get(requestId);
	if (approvedToken) {
		room.approvedTokens.delete(requestId);
		return NextResponse.json({
			status: "approved",
			token: approvedToken.token,
			livekitUrl: approvedToken.livekitUrl,
		});
	}

	if (room.waitingRoom.has(requestId)) {
		return NextResponse.json({ status: "waiting" });
	}

	return NextResponse.json({ status: "rejected" });
}
