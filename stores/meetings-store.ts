import { create } from "zustand";
import { meetingsApi } from "@/lib/api-client";
import type { Meeting } from "@/types/meeting";

interface MeetingsState {
	meetings: Meeting[];
	isLoading: boolean;
	fetchMeetings: (groupId: string) => Promise<void>;
	deleteMeeting: (id: string) => Promise<void>;
}

export const useMeetingsStore = create<MeetingsState>((set, get) => ({
	meetings: [],
	isLoading: false,

	fetchMeetings: async (groupId: string) => {
		set({ isLoading: true });
		try {
			const meetings = await meetingsApi.list(groupId);
			set({ meetings });
		} catch (error) {
			console.error("Failed to fetch meetings:", error);
		} finally {
			set({ isLoading: false });
		}
	},

	deleteMeeting: async (id: string) => {
		try {
			await meetingsApi.delete(id);
			set({ meetings: get().meetings.filter((m) => m.id !== id) });
		} catch (error) {
			console.error("Failed to delete meeting:", error);
		}
	},
}));
