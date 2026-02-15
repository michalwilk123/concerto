import type { FileDoc, FileWithUrl, FolderDoc } from "@/types/files";
import type { Role } from "@/types/room";

// Request/Response types
export interface CreateRoomParams {
	displayName: string;
}

export interface CreateRoomResponse {
	success: boolean;
	roomKey: string;
}

export interface JoinRoomParams {
	roomKey: string;
	participantName: string;
}

export interface JoinRoomResponse {
	status?: "waiting";
	requestId?: string;
	token?: string;
	livekitUrl?: string;
	role?: Role;
}

export interface RoomInfoParams {
	roomKey: string;
	participantName: string;
}

export interface RoomInfoResponse {
	mode: "public" | "private";
}

export interface ApproveParams {
	roomKey: string;
	requestId: string;
	participantName: string;
}

export interface RejectParams {
	roomKey: string;
	requestId: string;
	participantName: string;
}

export interface KickParams {
	roomKey: string;
	targetIdentity: string;
	participantName: string;
}

export interface PromoteParams {
	roomKey: string;
	targetIdentity: string;
	participantName: string;
	targetRole: "moderator" | "student";
}

export interface DemoteParams {
	roomKey: string;
	targetIdentity: string;
	participantName: string;
	targetRole: "student" | "participant";
}

export interface SetModeParams {
	roomKey: string;
	mode: "public" | "private";
	participantName: string;
}

export interface WaitingListParams {
	roomKey: string;
	participantName: string;
}

export interface WaitingParticipant {
	requestId: string;
	name: string;
	timestamp: number;
}

export interface CheckApprovalParams {
	roomKey: string;
	requestId: string;
}

export interface ApprovalStatus {
	status: "approved" | "pending" | "rejected";
	token?: string;
	livekitUrl?: string;
	role?: Role;
}

// API Client
export const roomApi = {
	async create(params: CreateRoomParams): Promise<CreateRoomResponse> {
		const response = await fetch("/api/room/create", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(params),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to create room");
		}

		return response.json();
	},

	async join(params: JoinRoomParams): Promise<JoinRoomResponse> {
		const response = await fetch("/api/room/join", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(params),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to join room");
		}

		return response.json();
	},

	async getInfo(params: RoomInfoParams): Promise<RoomInfoResponse> {
		const response = await fetch("/api/room/info", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(params),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to get room info");
		}

		return response.json();
	},

	async approve(params: ApproveParams): Promise<void> {
		const response = await fetch("/api/room/approve", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(params),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to approve participant");
		}
	},

	async reject(params: RejectParams): Promise<void> {
		const response = await fetch("/api/room/reject", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(params),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to reject participant");
		}
	},

	async kick(params: KickParams): Promise<void> {
		const response = await fetch("/api/room/kick", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(params),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to kick participant");
		}
	},

	async promote(params: PromoteParams): Promise<void> {
		const response = await fetch("/api/room/promote", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(params),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to promote participant");
		}
	},

	async demote(params: DemoteParams): Promise<void> {
		const response = await fetch("/api/room/demote", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(params),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to demote participant");
		}
	},

	async setMode(params: SetModeParams): Promise<void> {
		const response = await fetch("/api/room/set-mode", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(params),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to set room mode");
		}
	},

	async getWaitingList(params: WaitingListParams): Promise<WaitingParticipant[]> {
		const response = await fetch("/api/room/waiting-list", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(params),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to get waiting list");
		}

		const data = await response.json();
		return data.waitingList || [];
	},

	async checkApproval(params: CheckApprovalParams): Promise<ApprovalStatus> {
		const response = await fetch("/api/room/check-approval", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(params),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to check approval status");
		}

		return response.json();
	},

	async adminLeave(params: { roomKey: string }): Promise<void> {
		const response = await fetch("/api/room/admin-leave", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(params),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to leave room");
		}
	},
};

// Files API Client
export const filesApi = {
	async list(folderId?: string | null): Promise<FileWithUrl[]> {
		const param = folderId ? `?folderId=${folderId}` : "";
		const response = await fetch(`/api/files${param}`);

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to list files");
		}

		return response.json();
	},

	async upload(params: { file: File; folderId?: string | null }): Promise<FileDoc> {
		const formData = new FormData();
		formData.append("file", params.file);
		if (params.folderId) formData.append("folderId", params.folderId);

		const response = await fetch("/api/files/upload", {
			method: "POST",
			body: formData,
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Upload failed");
		}

		return response.json();
	},

	async delete(id: string): Promise<void> {
		const response = await fetch(`/api/files/${id}`, { method: "DELETE" });

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Delete failed");
		}
	},

	async getStorage(): Promise<{ totalBytes: number }> {
		const response = await fetch("/api/files/storage");

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to get storage info");
		}

		return response.json();
	},

	async seed(): Promise<{ meetingsFolderId?: string }> {
		const response = await fetch("/api/files/seed", { method: "POST" });

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to seed files");
		}

		return response.json();
	},
};

// Folders API Client
export const foldersApi = {
	async list(parentId?: string | null): Promise<FolderDoc[]> {
		const response = await fetch(`/api/folders?parentId=${parentId ?? ""}`);

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to list folders");
		}

		return response.json();
	},

	async get(id: string): Promise<FolderDoc> {
		const response = await fetch(`/api/folders/${id}`);

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to get folder");
		}

		return response.json();
	},

	async create(params: { name: string; parentId?: string | null }): Promise<FolderDoc> {
		const response = await fetch("/api/folders", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(params),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to create folder");
		}

		return response.json();
	},

	async delete(id: string): Promise<void> {
		const response = await fetch(`/api/folders/${id}`, { method: "DELETE" });

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Delete failed");
		}
	},

	async findMeetingsFolder(): Promise<FolderDoc | null> {
		const folders = await foldersApi.list(null);
		return folders.find((f) => f.isSystem && f.name === "meetings") ?? null;
	},
};
