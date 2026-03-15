import { useAuthStore } from "@/stores/auth-store";
import { BASE_URL, resolveApiUrl } from "@/lib/base-url";
import type {
  Group,
  Meeting,
  MobileMeetingJoinResponse,
  StatusPollResponse,
  ChatMessage,
  FileWithUrl,
  FolderDoc,
} from "@/lib/types";

export { BASE_URL, resolveApiUrl };

function describeNetworkError(error: unknown, url: string) {
  const message = error instanceof Error ? error.message : String(error);
  return `Network request failed for ${url}. BASE_URL=${BASE_URL}. Original error: ${message}`;
}

export async function fetchWithAuth(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = useAuthStore.getState().token;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${BASE_URL}${path}`;

  try {
    return await fetch(url, {
      ...options,
      headers,
    });
  } catch (error) {
    console.error("[expo api] fetch failed", {
      url,
      method: options.method ?? "GET",
      baseUrl: BASE_URL,
      error,
    });
    throw new Error(describeNetworkError(error, url));
  }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetchWithAuth(path, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const groupsApi = {
  list: () => apiFetch<Group[]>("/api/groups"),
};

export const filesApi = {
  listFiles: (groupId: string, folderId?: string | null) => {
    const params = folderId ? `?folderId=${encodeURIComponent(folderId)}` : "";
    return apiFetch<FileWithUrl[]>(`/api/mobile/groups/${groupId}/files${params}`).then((files) =>
      files.map((file) => ({ ...file, url: resolveApiUrl(file.url) }))
    );
  },
  listFolders: (groupId: string, parentId?: string | null) => {
    const params = parentId ? `?parentId=${encodeURIComponent(parentId)}` : "";
    return apiFetch<FolderDoc[]>(`/api/mobile/groups/${groupId}/folders${params}`);
  },
  downloadUrl: (fileId: string) =>
    resolveApiUrl(`/api/files?id=${encodeURIComponent(fileId)}`),
};

export const meetingsApi = {
  list: (groupId: string) =>
    apiFetch<Meeting[]>(`/api/meetings?groupId=${groupId}`),
  join: (meetingId: string, participantName: string) =>
    apiFetch<MobileMeetingJoinResponse>(
      `/api/mobile/meetings/${meetingId}/join`,
      {
        method: "POST",
        body: JSON.stringify({ participantName }),
      }
    ),
  pollStatus: (meetingId: string, participantName: string) =>
    apiFetch<StatusPollResponse>(
      `/api/mobile/meetings/${meetingId}/status`,
      {
        method: "POST",
        body: JSON.stringify({ participantName }),
      }
    ),
  chatHistory: (meetingId: string) =>
    apiFetch<ChatMessage[]>(`/api/mobile/meetings/${meetingId}/chat`),
  sendChat: (meetingId: string, content: string) =>
    apiFetch<ChatMessage>(`/api/mobile/meetings/${meetingId}/chat`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
  toggleReaction: (messageId: string, emoji: string) =>
    apiFetch<{ reactions: ChatMessage["reactions"] }>(
      `/api/mobile/chat/reactions`,
      {
        method: "POST",
        body: JSON.stringify({ messageId, emoji }),
      }
    ),
  meetingFiles: (meetingId: string, folderId?: string | null) => {
    const params = folderId ? `?folderId=${encodeURIComponent(folderId)}` : "";
    return apiFetch<FileWithUrl[]>(`/api/mobile/meetings/${meetingId}/files${params}`).then((files) =>
      files.map((file) => ({ ...file, url: resolveApiUrl(file.url) }))
    );
  },
};
