import { create } from "zustand";
import type { Role } from "@/types/room";
import type { SidebarTab } from "@/types/sidebar";

interface RoomSessionState {
	meetingId: string;
	participantName: string;
	role: Role;
	sidebarOpen: boolean;
	activeTab: SidebarTab;
	initialize: (meetingId: string, participantName: string, role: Role) => void;
	setRole: (role: Role) => void;
	setSidebarOpen: (open: boolean) => void;
	setActiveTab: (tab: SidebarTab) => void;
}

export const useRoomStore = create<RoomSessionState>((set) => ({
	meetingId: "",
	participantName: "",
	role: "student",
	sidebarOpen: false,
	activeTab: "participants",

	initialize: (meetingId, participantName, role) => {
		set({ meetingId, participantName, role });
	},

	setRole: (role) => set({ role }),

	setSidebarOpen: (open) => set({ sidebarOpen: open }),

	setActiveTab: (tab) => set({ activeTab: tab }),
}));
