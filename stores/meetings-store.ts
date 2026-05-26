import { create } from "zustand";
import { meetingsApi } from "@/lib/api-client";
import { logger } from "@/lib/logger";
import type { Meeting } from "@/types/meeting";

interface MeetingsState {
  meetings: Meeting[];
  isLoading: boolean;
  fetchMeetings: (groupId: string) => Promise<void>;
  patchMeeting: (
    id: string,
    data: { isPublic?: boolean; requiresApproval?: boolean },
  ) => Promise<void>;
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
      logger.error("[meetings] fetchMeetings failed", error);
    } finally {
      set({ isLoading: false });
    }
  },

  patchMeeting: async (id: string, data: { isPublic?: boolean; requiresApproval?: boolean }) => {
    try {
      const updated = await meetingsApi.patch(id, data);
      set({ meetings: get().meetings.map((m) => (m.id === id ? updated : m)) });
    } catch (error) {
      logger.error("[meetings] patchMeeting failed", error);
      throw error;
    }
  },

  deleteMeeting: async (id: string) => {
    try {
      await meetingsApi.delete(id);
      set({ meetings: get().meetings.filter((m) => m.id !== id) });
    } catch (error) {
      logger.error("[meetings] deleteMeeting failed", error);
      throw error;
    }
  },
}));
