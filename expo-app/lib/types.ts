export interface Group {
  id: string;
  name: string;
  createdAt: string;
}

export interface Meeting {
  id: string;
  name: string;
  groupId: string;
  isPublic: boolean;
  requiresApproval: boolean;
  folderId: string | null;
  createdAt: string;
}

export interface JoinRoomResponse {
  status: "joined" | "waiting_for_host" | "waiting_for_approval";
  token?: string;
  role?: "teacher" | "student";
  groupId?: string;
}

export interface MobileMeetingJoinResponse {
  status: "joined" | "waiting_for_host" | "waiting_for_approval";
  authToken?: string;
  token?: string;
  role?: "teacher" | "student";
  groupId?: string;
  message?: string;
  rtkMeetingId?: string;
}

export interface StatusPollResponse {
  status:
    | "waiting_for_approval"
    | "approved"
    | "rejected"
    | "host_present"
    | "waiting_for_host";
  token?: string;
  authToken?: string;
  role?: string;
  groupId?: string;
}

export interface FileWithUrl {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  groupId: string;
  folderId: string | null;
  meetingId: string | null;
  uploadedById: string | null;
  uploadedByName: string | null;
  createdAt: string;
  url: string;
}

export interface FolderDoc {
  id: string;
  name: string;
  groupId: string;
  parentId: string | null;
  meetingId: string | null;
  createdAt: string;
}

export interface ChatReaction {
  emoji: string;
  count: number;
  userNames: string[];
  reacted: boolean;
}

export interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  groupId: string;
  meetingId: string | null;
  reactions: ChatReaction[];
  createdAt: string;
}
