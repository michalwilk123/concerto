export type Role = "teacher" | "student";

export interface RoomParticipant {
	id: string;
	name: string;
	presetName?: string;
}

export function isTeacher(role: Role): boolean {
	return role === "teacher";
}

export function presetToRole(presetName?: string): Role {
	switch (presetName) {
		case "webinar_presenter":
			return "teacher";
		case "webinar_viewer":
		default:
			return "student";
	}
}
