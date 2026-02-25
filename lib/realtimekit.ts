import { nanoid } from "nanoid";
import type { Role } from "@/types/room";

const RTK_ORG_ID = process.env.RTK_ORG_ID || "";
const RTK_API_KEY = process.env.RTK_API_KEY || "";
const RTK_BASE_URL = "https://api.realtime.cloudflare.com/v2";

function authHeader(): string {
	const encoded = Buffer.from(`${RTK_ORG_ID}:${RTK_API_KEY}`).toString("base64");
	return `Basic ${encoded}`;
}

async function rtkFetch(path: string, options: RequestInit = {}): Promise<Response> {
	const res = await fetch(`${RTK_BASE_URL}${path}`, {
		...options,
		headers: {
			"Content-Type": "application/json",
			Authorization: authHeader(),
			...options.headers,
		},
	});
	if (!res.ok) {
		const text = await res.text().catch(() => "");
		throw new Error(`RealtimeKit API error ${res.status}: ${text}`);
	}
	return res;
}

export async function createMeeting(): Promise<string> {
	const res = await rtkFetch("/meetings", { method: "POST", body: JSON.stringify({}) });
	const data = await res.json();
	return data.data.id;
}

export async function addParticipant(
	meetingId: string,
	name: string,
	presetName: string,
): Promise<{ id: string; token: string }> {
	const res = await rtkFetch(`/meetings/${meetingId}/participants`, {
		method: "POST",
		body: JSON.stringify({ name, preset_name: presetName, custom_participant_id: nanoid() }),
	});
	const data = await res.json();
	return { id: data.data.id, token: data.data.token };
}

export async function removeParticipant(meetingId: string, participantId: string): Promise<void> {
	await rtkFetch(`/meetings/${meetingId}/participants/${participantId}`, {
		method: "DELETE",
	});
}

export async function updateParticipantPreset(
	meetingId: string,
	participantId: string,
	presetName: string,
): Promise<void> {
	await rtkFetch(`/meetings/${meetingId}/participants/${participantId}`, {
		method: "PATCH",
		body: JSON.stringify({ preset_name: presetName }),
	});
}

export async function listParticipants(
	meetingId: string,
): Promise<Array<{ id: string; name: string; preset_name: string }>> {
	const res = await rtkFetch(`/meetings/${meetingId}/participants`);
	const data = await res.json();
	return data.data;
}

export function roleToPreset(role: Role): string {
	switch (role) {
		case "teacher":
			return "group_call_host";
		default:
			return "group_call_participant";
	}
}

export interface RtkRecording {
	id: string;
	meeting_id: string;
	download_url: string;
	file_size: number;
	output_file_name: string;
	stopped_time: string;
	recording_duration: number;
}

export async function listRecordings(): Promise<RtkRecording[]> {
	const res = await rtkFetch("/recordings");
	const data = await res.json();
	return data.data ?? [];
}
