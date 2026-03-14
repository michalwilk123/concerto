import { create } from "zustand";
import { meetingsApi } from "@/lib/api";
import type { Meeting } from "@/lib/types";

interface MeetingsState {
  meetings: Meeting[];
  isLoading: boolean;
  error: string | null;
  clearMeetings: () => void;
  fetchMeetings: (groupId: string) => Promise<void>;
}

export const useMeetingsStore = create<MeetingsState>((set) => ({
  meetings: [],
  isLoading: false,
  error: null,

  clearMeetings: () => set({ meetings: [], error: null, isLoading: false }),

  fetchMeetings: async (groupId: string) => {
    set({ isLoading: true, error: null });
    try {
      const meetings = await meetingsApi.list(groupId);
      set({ meetings, isLoading: false });
    } catch (e: any) {
      set({ isLoading: false, error: e.message });
    }
  },
}));
