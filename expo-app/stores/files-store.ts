import { create } from "zustand";
import { filesApi } from "@/lib/api";
import type { FileWithUrl, FolderDoc } from "@/lib/types";

interface BreadcrumbEntry {
  id: string | null;
  name: string;
}

interface FilesState {
  files: FileWithUrl[];
  folders: FolderDoc[];
  currentFolderId: string | null;
  folderPath: BreadcrumbEntry[];
  isLoading: boolean;
  error: string | null;
  previewFile: FileWithUrl | null;
  fetchContents: (groupId: string, folderId?: string | null) => Promise<void>;
  navigateToFolder: (groupId: string, folder: FolderDoc) => Promise<void>;
  navigateUp: (groupId: string) => Promise<void>;
  navigateToBreadcrumb: (groupId: string, index: number) => Promise<void>;
  setPreviewFile: (file: FileWithUrl | null) => void;
  reset: () => void;
}

const initialState = {
  files: [],
  folders: [],
  currentFolderId: null,
  folderPath: [{ id: null, name: "Files" }] as BreadcrumbEntry[],
  isLoading: false,
  error: null,
  previewFile: null as FileWithUrl | null,
};

export const useFilesStore = create<FilesState>((set, get) => ({
  ...initialState,

  fetchContents: async (groupId, folderId = null) => {
    set({ isLoading: true, error: null });
    try {
      const [files, folders] = await Promise.all([
        filesApi.listFiles(groupId, folderId),
        filesApi.listFolders(groupId, folderId),
      ]);
      set({ files, folders, currentFolderId: folderId, isLoading: false });
    } catch (e: any) {
      set({ isLoading: false, error: e.message });
    }
  },

  navigateToFolder: async (groupId, folder) => {
    const { folderPath } = get();
    set({ folderPath: [...folderPath, { id: folder.id, name: folder.name }] });
    await get().fetchContents(groupId, folder.id);
  },

  navigateUp: async (groupId) => {
    const { folderPath } = get();
    if (folderPath.length <= 1) return;
    const newPath = folderPath.slice(0, -1);
    const parentId = newPath[newPath.length - 1].id;
    set({ folderPath: newPath });
    await get().fetchContents(groupId, parentId);
  },

  navigateToBreadcrumb: async (groupId, index) => {
    const { folderPath } = get();
    if (index >= folderPath.length - 1) return;
    const newPath = folderPath.slice(0, index + 1);
    const targetId = newPath[newPath.length - 1].id;
    set({ folderPath: newPath });
    await get().fetchContents(groupId, targetId);
  },

  setPreviewFile: (file) => set({ previewFile: file }),

  reset: () => set(initialState),
}));
