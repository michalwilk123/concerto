export interface FileDoc {
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
}

export interface FolderDoc {
  id: string;
  name: string;
  groupId: string;
  parentId: string | null;
  meetingId: string | null;
  createdAt: string;
}

export interface FileWithUrl extends FileDoc {
  url: string;
}
