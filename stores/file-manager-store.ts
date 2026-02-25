import { create } from "zustand";
import { filesApi, foldersApi } from "@/lib/api-client";
import type { FileWithUrl, FolderDoc } from "@/types/files";

interface FileManagerState {
	files: FileWithUrl[];
	folders: FolderDoc[];
	currentFolderId: string | null;
	currentFolder: FolderDoc | null;
	currentGroupId: string | null;
	previewFile: FileWithUrl | null;
	isLoading: boolean;
	hasFetched: boolean;
	storageUsed: number;

	setCurrentGroupId: (id: string | null) => void;
	setCurrentFolderId: (id: string | null) => void;
	setPreviewFile: (file: FileWithUrl | null) => void;
	fetchContents: (folderId?: string | null) => Promise<void>;
	fetchStorage: () => Promise<void>;
	uploadFile: (file: File, folderId?: string | null) => Promise<void>;
	deleteFile: (id: string) => Promise<void>;
	createFolder: (name: string, parentId?: string | null) => Promise<void>;
	deleteFolder: (id: string) => Promise<void>;
}

export const useFileManagerStore = create<FileManagerState>((set, get) => ({
	files: [],
	folders: [],
	currentFolderId: null,
	currentFolder: null,
	currentGroupId: null,
	previewFile: null,
	isLoading: false,
	hasFetched: false,
	storageUsed: 0,

	setCurrentGroupId: (id) =>
		set({ currentGroupId: id, currentFolderId: null, files: [], folders: [], hasFetched: false }),

	setCurrentFolderId: (id) => set({ currentFolderId: id }),

	setPreviewFile: (file) => set({ previewFile: file }),

	fetchContents: async (folderId) => {
		const groupId = get().currentGroupId;
		if (!groupId) return;

		set({ isLoading: true });
		try {
			const [files, folders] = await Promise.all([
				filesApi.list(groupId, folderId),
				foldersApi.list(groupId, folderId),
			]);

			// Fetch current folder info for breadcrumbs
			let currentFolder: FolderDoc | null = null;
			if (folderId) {
				try {
					currentFolder = await foldersApi.get(folderId);
				} catch {
					// ignore
				}
			}

			set({ files, folders, currentFolder, isLoading: false, hasFetched: true });
		} catch {
			set({ isLoading: false });
		}
	},

	fetchStorage: async () => {
		const groupId = get().currentGroupId;
		if (!groupId) return;

		try {
			const { totalBytes } = await filesApi.getStorage(groupId);
			set({ storageUsed: totalBytes });
		} catch {
			// ignore
		}
	},

	uploadFile: async (file, folderId) => {
		const groupId = get().currentGroupId;
		if (!groupId) return;

		await filesApi.upload({ file, groupId, folderId });

		// Refresh contents and storage
		await Promise.all([get().fetchContents(get().currentFolderId), get().fetchStorage()]);
	},

	deleteFile: async (id) => {
		await filesApi.delete(id);
		await Promise.all([get().fetchContents(get().currentFolderId), get().fetchStorage()]);
	},

	createFolder: async (name, parentId) => {
		const groupId = get().currentGroupId;
		if (!groupId) return;

		await foldersApi.create({ name, groupId, parentId: parentId ?? get().currentFolderId });
		await get().fetchContents(get().currentFolderId);
	},

	deleteFolder: async (id) => {
		await foldersApi.delete(id);
		await get().fetchContents(get().currentFolderId);
	},
}));
