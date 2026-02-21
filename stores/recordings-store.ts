import { create } from "zustand";
import { recordingsApi } from "@/lib/api-client";
import type { Recording } from "@/types/recording";

interface RecordingsState {
	recordings: Recording[];
	isLoading: boolean;
	fetchRecordings: (groupId: string) => Promise<void>;
}

export const useRecordingsStore = create<RecordingsState>((set) => ({
	recordings: [],
	isLoading: false,

	fetchRecordings: async (groupId: string) => {
		set({ isLoading: true });
		try {
			const recordings = await recordingsApi.list(groupId);
			set({ recordings });
		} catch (error) {
			console.error("Failed to fetch recordings:", error);
		} finally {
			set({ isLoading: false });
		}
	},
}));
