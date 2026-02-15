export interface FileDoc {
	id: string;
	name: string;
	mimeType: string;
	size: number;
	storagePath: string;
	ownerId: string;
	folderId: string | null;
	createdAt: string;
}

export interface FolderDoc {
	id: string;
	name: string;
	ownerId: string;
	parentId: string | null;
	isSystem: boolean;
	createdAt: string;
}

export interface FileWithUrl extends FileDoc {
	url: string;
}
