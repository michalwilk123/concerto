import { create } from "zustand";
import { roomApi } from "@/lib/api-client";
import type { Role } from "@/types/room";
import type { SidebarTab } from "@/types/sidebar";

interface RoomSessionState {
	roomKey: string;
	participantName: string;
	role: Role;
	roomMode: "public" | "private";
	sidebarOpen: boolean;
	activeTab: SidebarTab;
	initialize: (roomKey: string, participantName: string, role: Role) => void;
	setRole: (role: Role) => void;
	setRoomMode: (mode: "public" | "private") => void;
	toggleRoomMode: () => Promise<void>;
	setSidebarOpen: (open: boolean) => void;
	setActiveTab: (tab: SidebarTab) => void;
}

export const useRoomStore = create<RoomSessionState>((set, get) => ({
	roomKey: "",
	participantName: "",
	role: "participant",
	roomMode: "public",
	sidebarOpen: false,
	activeTab: "participants",

	initialize: (roomKey, participantName, role) => {
		set({ roomKey, participantName, role });
	},

	setRole: (role) => set({ role }),

	setRoomMode: (mode) => set({ roomMode: mode }),

	setSidebarOpen: (open) => set({ sidebarOpen: open }),

	setActiveTab: (tab) => set({ activeTab: tab }),

	toggleRoomMode: async () => {
		const { roomKey, participantName, roomMode } = get();
		const newMode = roomMode === "public" ? "private" : "public";
		try {
			await roomApi.setMode({ roomKey, mode: newMode, participantName });
			set({ roomMode: newMode });
		} catch {
			// silently fail
		}
	},
}));
