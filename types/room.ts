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
		case "group_call_host":
			return "teacher";
		default:
			return "student";
	}
}
