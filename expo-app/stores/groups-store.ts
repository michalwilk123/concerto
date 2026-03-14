import { create } from "zustand";
import { groupsApi } from "@/lib/api";
import type { Group } from "@/lib/types";
import { useMeetingsStore } from "@/stores/meetings-store";

interface GroupsState {
  groups: Group[];
  selectedGroupId: string | null;
  isLoading: boolean;
  error: string | null;
  reset: () => void;
  fetchGroups: () => Promise<void>;
  selectGroup: (id: string) => Promise<void>;
}

export const useGroupsStore = create<GroupsState>((set, get) => ({
  groups: [],
  selectedGroupId: null,
  isLoading: false,
  error: null,

  reset: () => set({ groups: [], selectedGroupId: null, isLoading: false, error: null }),

  fetchGroups: async () => {
    set({ isLoading: true, error: null });
    try {
      const groups = await groupsApi.list();
      const current = get().selectedGroupId;
      const selectedGroupId =
        current && groups.some((g) => g.id === current)
          ? current
          : groups[0]?.id ?? null;
      set({ groups, selectedGroupId, isLoading: false });

      if (selectedGroupId) {
        await useMeetingsStore.getState().fetchMeetings(selectedGroupId);
      } else {
        useMeetingsStore.getState().clearMeetings();
      }
    } catch (e: any) {
      set({ isLoading: false, error: e.message });
    }
  },

  selectGroup: async (id: string) => {
    if (get().selectedGroupId === id) return;
    set({ selectedGroupId: id });
    await useMeetingsStore.getState().fetchMeetings(id);
  },
}));
