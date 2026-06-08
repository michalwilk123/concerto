import type { ChatMessage, CreateChatMessageParams, ToggleReactionParams } from "@/types/chat";
import type { FileWithUrl, FolderDoc } from "@/types/files";
import type { Group, GroupMember } from "@/types/group";
import type { Meeting } from "@/types/meeting";
import type { Recording } from "@/types/recording";
import type { Role } from "@/types/room";
import { defaultLocale } from "@/i18n/config";

// Request/Response types
export interface CreateRoomParams {
  displayName: string;
  groupId: string;
  isPublic?: boolean;
  requiresApproval?: boolean;
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

export type JoinStatus =
  | "joined"
  | "waiting_for_host"
  | "waiting_for_approval"
  | "approved"
  | "rejected"
  | "host_present";

export interface JoinRoomResponse {
  status?: JoinStatus;
  token?: string;
  role?: Role;
  groupId?: string;
}

export interface WaitingParticipant {
  participantName: string;
  joinedAt: number;
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

  async endMeeting(params: { meetingId: string }): Promise<void> {
    const response = await fetch("/api/room/admin-leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to end meeting");
    }
  },

  async pollStatus(params: {
    meetingId: string;
    participantName: string;
  }): Promise<JoinRoomResponse> {
    const response = await fetch("/api/room/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to poll status");
    }

    return response.json();
  },

  async approveParticipant(params: { meetingId: string; participantName: string }): Promise<void> {
    const response = await fetch("/api/room/waiting/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to approve participant");
    }
  },

  async rejectParticipant(params: { meetingId: string; participantName: string }): Promise<void> {
    const response = await fetch("/api/room/waiting/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to reject participant");
    }
  },

  async listWaiting(meetingId: string): Promise<{ waiting: WaitingParticipant[] }> {
    const response = await fetch(
      `/api/room/waiting/list?meetingId=${encodeURIComponent(meetingId)}`,
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to list waiting participants");
    }

    return response.json();
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
  }): Promise<FileWithUrl> {
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
    const response = await fetch(`/api/files?id=${encodeURIComponent(id)}`, { method: "DELETE" });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Delete failed");
    }
  },

  async rename(id: string, name: string): Promise<FileWithUrl> {
    const response = await fetch("/api/files", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Rename failed");
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

  async seed(groupId: string): Promise<{ message: string }> {
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

  async move(fileId: string, targetFolderId: string | null): Promise<FileWithUrl> {
    const response = await fetch("/api/files/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileId, targetFolderId }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Move failed");
    }
    return response.json();
  },

  async bulkMove(
    items: { type: "file" | "folder"; id: string }[],
    targetFolderId: string | null,
  ): Promise<{ moved: string[]; errors: { id: string; error: string }[] }> {
    const response = await fetch("/api/files/bulk-move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, targetFolderId }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Bulk move failed");
    }
    return response.json();
  },

  async bulkDelete(
    items: { type: "file" | "folder"; id: string }[],
  ): Promise<{ deleted: string[]; errors: { id: string; error: string }[] }> {
    const response = await fetch("/api/files/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Bulk delete failed");
    }
    return response.json();
  },
};

export const meetingFilesApi = {
  async list(meetingId: string, folderId?: string | null): Promise<FileWithUrl[]> {
    const params = new URLSearchParams({ meetingId });
    if (folderId) params.set("folderId", folderId);
    const response = await fetch(`/api/meeting-files?${params}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to list meeting files");
    }
    return response.json();
  },

  async upload(params: { meetingId: string; file: File; folderId?: string | null }): Promise<FileWithUrl> {
    const formData = new FormData();
    formData.append("meetingId", params.meetingId);
    formData.append("file", params.file);
    if (params.folderId) formData.append("folderId", params.folderId);

    const response = await fetch("/api/meeting-files", {
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
    const response = await fetch(`/api/meeting-files?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Delete failed");
    }
  },

  async rename(id: string, name: string): Promise<FileWithUrl> {
    const response = await fetch("/api/meeting-files", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Rename failed");
    }
    return response.json();
  },

  async move(fileId: string, targetFolderId: string | null): Promise<FileWithUrl> {
    const response = await fetch("/api/meeting-files/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileId, targetFolderId }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Move failed");
    }
    return response.json();
  },

  async bulkMove(
    items: { type: "file" | "folder"; id: string }[],
    targetFolderId: string | null,
  ): Promise<{ moved: string[]; errors: { id: string; error: string }[] }> {
    const response = await fetch("/api/meeting-files/bulk-move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, targetFolderId }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Bulk move failed");
    }
    return response.json();
  },

  async bulkDelete(
    items: { type: "file" | "folder"; id: string }[],
  ): Promise<{ deleted: string[]; errors: { id: string; error: string }[] }> {
    const response = await fetch("/api/meeting-files/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Bulk delete failed");
    }
    return response.json();
  },
};

export const meetingFoldersApi = {
  async list(meetingId: string, parentId?: string | null): Promise<FolderDoc[]> {
    const params = new URLSearchParams({ meetingId });
    if (parentId) params.set("parentId", parentId);
    const response = await fetch(`/api/meeting-files/folders?${params}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to list meeting folders");
    }
    return response.json();
  },

  async get(id: string): Promise<FolderDoc> {
    const response = await fetch(`/api/meeting-files/folders/${id}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to get meeting folder");
    }
    return response.json();
  },

  async create(params: { name: string; meetingId: string; parentId?: string | null }): Promise<FolderDoc> {
    const response = await fetch("/api/meeting-files/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create meeting folder");
    }
    return response.json();
  },

  async rename(id: string, name: string): Promise<FolderDoc> {
    const response = await fetch(`/api/meeting-files/folders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Rename failed");
    }
    return response.json();
  },

  async move(id: string, parentId: string | null): Promise<FolderDoc> {
    const response = await fetch(`/api/meeting-files/folders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentId }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Move failed");
    }
    return response.json();
  },

  async delete(id: string): Promise<void> {
    const response = await fetch(`/api/meeting-files/folders/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Delete failed");
    }
  },

  async getAncestors(id: string): Promise<FolderDoc[]> {
    const response = await fetch(`/api/meeting-files/folders/${id}/ancestors`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to get ancestors");
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

  async move(id: string, parentId: string | null): Promise<FolderDoc> {
    const response = await fetch(`/api/folders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentId }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Move failed");
    }
    return response.json();
  },

  async rename(id: string, name: string): Promise<FolderDoc> {
    const response = await fetch(`/api/folders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Rename failed");
    }
    return response.json();
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
    params: {
      page?: number;
      limit?: number;
      search?: string;
      sortBy?: string;
      sortDir?: "asc" | "desc";
    } = {},
  ): Promise<ListUsersResponse> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set("page", String(params.page));
    if (params.limit) searchParams.set("limit", String(params.limit));
    if (params.search) searchParams.set("search", params.search);
    if (params.sortBy) searchParams.set("sortBy", params.sortBy);
    if (params.sortDir) searchParams.set("sortDir", params.sortDir);
    const response = await fetch(`/api/admin/users?${searchParams}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to list users");
    }
    return response.json();
  },

  async createUser(data: {
    name: string;
    email: string;
    password: string;
    role?: string;
    isActive?: boolean;
  }): Promise<AdminUser> {
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create user");
    }
    return response.json();
  },

  async resetPassword(userId: string, newPassword: string): Promise<void> {
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to reset password");
    }
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

// Users API Client (lightweight search for assignable non-admin users)
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
  async list(
    meetingId: string,
    limit = 100,
    options?: { participantName?: string },
  ): Promise<ChatMessage[]> {
    const params = new URLSearchParams({ meetingId, limit: String(limit) });
    if (options?.participantName) {
      params.set("participantName", options.participantName);
    }
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
  async get(id: string): Promise<Meeting> {
    const response = await fetch(`/api/meetings/${id}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to get meeting");
    }
    return response.json();
  },

  async list(groupId: string): Promise<Meeting[]> {
    const params = new URLSearchParams({ groupId });
    const response = await fetch(`/api/meetings?${params}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to list meetings");
    }

    return response.json();
  },

  async patch(
    id: string,
    data: { name?: string; isPublic?: boolean; requiresApproval?: boolean },
  ): Promise<Meeting> {
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
export interface LocaleEntry {
  code: string;
  label: string;
  isDefault: boolean;
  enabled: boolean;
  rtl: boolean;
  overrides: Record<string, string>;
}

export const translationsApi = {
  async getAll(): Promise<{ locales: LocaleEntry[] }> {
    const response = await fetch("/api/translations", { cache: "no-store" });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to load translations");
    }
    return response.json();
  },

  async getByLocale(locale: string): Promise<Record<string, string>> {
    const response = await fetch(`/api/translations?locale=${encodeURIComponent(locale)}`, {
      cache: "no-store",
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to load translations");
    }
    return response.json();
  },

  async getLocales(): Promise<{ code: string; label: string; isDefault: boolean }[]> {
    const response = await fetch("/api/translations/languages", { cache: "no-store" });
    if (!response.ok) return [{ code: defaultLocale, label: "English", isDefault: true }];
    const data = await response.json();
    return data.locales;
  },

  async saveAll(locales: LocaleEntry[]): Promise<void> {
    const response = await fetch("/api/translations", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locales }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to save translations");
    }
  },
};

// Recordings API Client
export const recordingsApi = {
  async list(groupId: string, meetingId?: string): Promise<Recording[]> {
    const params = new URLSearchParams({ groupId });
    if (meetingId) params.set("meetingId", meetingId);
    const response = await fetch(`/api/recordings?${params}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to list recordings");
    }

    return response.json();
  },
};
