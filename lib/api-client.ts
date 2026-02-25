import type { ChatMessage, CreateChatMessageParams, ToggleReactionParams } from "@/types/chat";
import type { FileDoc, FileWithUrl, FolderDoc } from "@/types/files";
import type { Group, GroupMember } from "@/types/group";
import type { Meeting } from "@/types/meeting";
import type { Recording } from "@/types/recording";
import type { Role } from "@/types/room";

// Request/Response types
export interface CreateRoomParams {
	displayName: string;
	groupId: string;
	isPublic?: boolean;
}

export interface CreateRoomResponse {
	success: boolean;
	meetingId: string;
}

export interface RejoinRoomParams {
	meetingId: string;
	groupId: string;
}

export interface JoinRoomParams {
	meetingId: string;
	participantName: string;
}

export interface JoinRoomResponse {
	token?: string;
	role?: Role;
	groupId?: string;
	meetingFolderId?: string;
}

export interface KickParams {
	meetingId: string;
	targetIdentity: string;
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

	async guestJoin(params: JoinRoomParams): Promise<JoinRoomResponse> {
		const response = await fetch("/api/room/guest-join", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(params),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to join room as guest");
		}

		return response.json();
	},

	async rejoin(params: RejoinRoomParams): Promise<CreateRoomResponse> {
		const response = await fetch("/api/room/rejoin", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(params),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to rejoin room");
		}

		return response.json();
	},

	async adminLeave(params: { meetingId: string }): Promise<void> {
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

// Groups API Client
export const groupsApi = {
	async list(): Promise<Group[]> {
		const response = await fetch("/api/groups");
		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to list groups");
		}
		return response.json();
	},

	async create(params: { name: string }): Promise<Group> {
		const response = await fetch("/api/groups", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(params),
		});
		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to create group");
		}
		return response.json();
	},

	async get(id: string): Promise<Group> {
		const response = await fetch(`/api/groups/${id}`);
		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to get group");
		}
		return response.json();
	},

	async update(id: string, params: { name: string }): Promise<Group> {
		const response = await fetch(`/api/groups/${id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(params),
		});
		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to update group");
		}
		return response.json();
	},

	async delete(id: string): Promise<void> {
		const response = await fetch(`/api/groups/${id}`, { method: "DELETE" });
		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to delete group");
		}
	},

	async getMembers(
		groupId: string,
	): Promise<(GroupMember & { userName: string; userEmail: string })[]> {
		const response = await fetch(`/api/groups/${groupId}/members`);
		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to list members");
		}
		return response.json();
	},

	async addMember(
		groupId: string,
		params: { userId: string; role?: "teacher" | "student" },
	): Promise<GroupMember> {
		const response = await fetch(`/api/groups/${groupId}/members`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(params),
		});
		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to add member");
		}
		return response.json();
	},

	async removeMember(groupId: string, userId: string): Promise<void> {
		const response = await fetch(`/api/groups/${groupId}/members?userId=${userId}`, {
			method: "DELETE",
		});
		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to remove member");
		}
	},
};

// Files API Client
export const filesApi = {
	async list(groupId: string, folderId?: string | null): Promise<FileWithUrl[]> {
		const params = new URLSearchParams({ groupId });
		if (folderId) params.set("folderId", folderId);
		const response = await fetch(`/api/files?${params}`);

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to list files");
		}

		return response.json();
	},

	async upload(params: {
		file: File;
		groupId: string;
		folderId?: string | null;
	}): Promise<FileDoc> {
		const formData = new FormData();
		formData.append("file", params.file);
		formData.append("groupId", params.groupId);
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

	async toggleEditable(id: string, isEditable: boolean): Promise<FileDoc> {
		const response = await fetch(`/api/files/${id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ isEditable }),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to update file");
		}

		return response.json();
	},

	async getStorage(groupId: string): Promise<{ totalBytes: number }> {
		const response = await fetch(`/api/files/storage?groupId=${groupId}`);

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to get storage info");
		}

		return response.json();
	},

	async seed(groupId: string): Promise<{ meetingsFolderId?: string }> {
		const response = await fetch("/api/files/seed", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ groupId }),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to seed files");
		}

		return response.json();
	},
};

// Folders API Client
export const foldersApi = {
	async list(groupId: string, parentId?: string | null): Promise<FolderDoc[]> {
		const params = new URLSearchParams({ groupId });
		if (parentId) params.set("parentId", parentId);
		const response = await fetch(`/api/folders?${params}`);

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

	async create(params: {
		name: string;
		groupId: string;
		parentId?: string | null;
	}): Promise<FolderDoc> {
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

	async findMeetingsFolder(groupId: string): Promise<FolderDoc | null> {
		const folders = await foldersApi.list(groupId, null);
		return folders.find((f) => f.isSystem && f.name === "meetings") ?? null;
	},

	async getAncestors(id: string): Promise<FolderDoc[]> {
		const response = await fetch(`/api/folders/${id}/ancestors`);

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to get folder ancestors");
		}

		return response.json();
	},

	async resolvePath(
		groupId: string,
		path: string[],
	): Promise<{ folderId: string; ancestors: FolderDoc[] }> {
		const response = await fetch("/api/folders/resolve", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ groupId, path }),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to resolve folder path");
		}

		return response.json();
	},
};

// Admin API Client
export interface AdminUser {
	id: string;
	name: string;
	email: string;
	role: string | null;
	banned: boolean | null;
	banReason: string | null;
	isActive: boolean;
	createdAt: string;
	image: string | null;
}

export interface ListUsersResponse {
	users: AdminUser[];
	total: number;
	page: number;
	limit: number;
}

export interface UpdateUserParams {
	role?: string;
	isActive?: boolean;
	banned?: boolean;
	banReason?: string | null;
}

export const adminApi = {
	async listUsers(
		params: { page?: number; limit?: number; search?: string } = {},
	): Promise<ListUsersResponse> {
		const searchParams = new URLSearchParams();
		if (params.page) searchParams.set("page", String(params.page));
		if (params.limit) searchParams.set("limit", String(params.limit));
		if (params.search) searchParams.set("search", params.search);
		const response = await fetch(`/api/admin/users?${searchParams}`);
		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to list users");
		}
		return response.json();
	},

	async updateUser(id: string, data: UpdateUserParams): Promise<AdminUser> {
		const response = await fetch(`/api/admin/users/${id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		});
		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to update user");
		}
		return response.json();
	},

	async deleteUser(id: string): Promise<void> {
		const response = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to delete user");
		}
	},
};

// Users API Client (lightweight search for teachers + admins)
export const usersApi = {
	async search(query: string): Promise<{ id: string; name: string; email: string }[]> {
		const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to search users");
		}
		return response.json();
	},
};

export const chatApi = {
	async list(meetingId: string, limit = 100): Promise<ChatMessage[]> {
		const params = new URLSearchParams({ meetingId, limit: String(limit) });
		const response = await fetch(`/api/chat/messages?${params}`);

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to load chat messages");
		}

		return response.json();
	},

	async create(params: CreateChatMessageParams): Promise<ChatMessage> {
		const response = await fetch("/api/chat/messages", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(params),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to send chat message");
		}

		return response.json();
	},

	async toggleReaction(
		params: ToggleReactionParams,
	): Promise<{ reactions: ChatMessage["reactions"] }> {
		const response = await fetch("/api/chat/reactions", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(params),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to toggle reaction");
		}

		return response.json();
	},
};

// Meetings API Client
export const meetingsApi = {
	async list(groupId: string): Promise<Meeting[]> {
		const params = new URLSearchParams({ groupId });
		const response = await fetch(`/api/meetings?${params}`);

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to list meetings");
		}

		return response.json();
	},

	async patch(id: string, data: { isPublic: boolean }): Promise<Meeting> {
		const response = await fetch(`/api/meetings/${id}`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to update meeting");
		}

		return response.json();
	},

	async delete(id: string): Promise<void> {
		const response = await fetch(`/api/meetings/${id}`, { method: "DELETE" });

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to delete meeting");
		}
	},
};

// Translations API Client
export const translationsApi = {
	async get(): Promise<Record<string, string>> {
		const response = await fetch("/api/translations");
		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to load translations");
		}
		return response.json();
	},

	async save(overrides: Record<string, string>): Promise<void> {
		const response = await fetch("/api/translations", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(overrides),
		});
		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to save translations");
		}
	},
};

// Recordings API Client
export const recordingsApi = {
	async list(groupId: string): Promise<Recording[]> {
		const params = new URLSearchParams({ groupId });
		const response = await fetch(`/api/recordings?${params}`);

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || "Failed to list recordings");
		}

		return response.json();
	},
};
