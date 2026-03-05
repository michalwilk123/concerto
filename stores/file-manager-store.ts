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
  selectedItems: Set<string>; // "file:id" | "folder:id"
  lastSelectedId: string | null;

  setCurrentGroupId: (id: string | null) => void;
  setCurrentFolderId: (id: string | null) => void;
  setPreviewFile: (file: FileWithUrl | null) => void;
  fetchContents: (folderId?: string | null) => Promise<void>;
  fetchStorage: (groupId?: string) => Promise<void>;
  uploadFile: (file: File, folderId?: string | null) => Promise<void>;
  deleteFile: (id: string) => Promise<void>;
  renameFile: (id: string, name: string) => Promise<void>;
  renameFolder: (id: string, name: string) => Promise<void>;
  createFolder: (name: string, parentId?: string | null) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  moveFile: (fileId: string, targetFolderId: string | null) => Promise<void>;
  moveFolder: (folderId: string, targetFolderId: string | null) => Promise<void>;
  bulkMove: (items: { type: "file" | "folder"; id: string }[], targetFolderId: string | null) => Promise<void>;
  bulkDelete: (items: { type: "file" | "folder"; id: string }[]) => Promise<void>;
  toggleSelect: (key: string) => void;
  rangeSelect: (key: string, allKeys: string[]) => void;
  selectAll: (allKeys: string[]) => void;
  clearSelection: () => void;
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
  selectedItems: new Set(),
  lastSelectedId: null,

  setCurrentGroupId: (id) =>
    set({ currentGroupId: id, currentFolderId: null, files: [], folders: [], hasFetched: false, selectedItems: new Set(), lastSelectedId: null }),

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

  fetchStorage: async (explicitGroupId?: string) => {
    const groupId = explicitGroupId ?? get().currentGroupId;
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
    await Promise.all([get().fetchContents(get().currentFolderId), get().fetchStorage()]);
  },

  deleteFile: async (id) => {
    await filesApi.delete(id);
    await Promise.all([get().fetchContents(get().currentFolderId), get().fetchStorage()]);
  },

  renameFile: async (id, name) => {
    const prev = get().files;
    set({ files: prev.map((f) => (f.id === id ? { ...f, name } : f)) });
    try {
      await filesApi.rename(id, name);
    } catch (err) {
      set({ files: prev });
      throw err;
    }
  },

  renameFolder: async (id, name) => {
    const prev = get().folders;
    set({ folders: prev.map((f) => (f.id === id ? { ...f, name } : f)) });
    try {
      await foldersApi.rename(id, name);
    } catch (err) {
      set({ folders: prev });
      throw err;
    }
  },

  createFolder: async (name, parentId) => {
    const groupId = get().currentGroupId;
    if (!groupId) return;
    const effectiveParentId = parentId !== undefined ? parentId : get().currentFolderId;
    await foldersApi.create({ name, groupId, parentId: effectiveParentId });
    await get().fetchContents(effectiveParentId);
  },

  deleteFolder: async (id) => {
    await foldersApi.delete(id);
    await get().fetchContents(get().currentFolderId);
  },

  moveFile: async (fileId, targetFolderId) => {
    const prev = { files: get().files, folders: get().folders };
    set({ files: prev.files.filter((f) => f.id !== fileId) });
    get().clearSelection();
    try {
      await filesApi.move(fileId, targetFolderId);
    } catch (err) {
      set({ files: prev.files, folders: prev.folders });
      throw err;
    }
  },

  moveFolder: async (folderId, targetFolderId) => {
    const prev = { files: get().files, folders: get().folders };
    set({ folders: prev.folders.filter((f) => f.id !== folderId) });
    get().clearSelection();
    try {
      await foldersApi.move(folderId, targetFolderId);
    } catch (err) {
      set({ files: prev.files, folders: prev.folders });
      throw err;
    }
  },

  bulkMove: async (items, targetFolderId) => {
    const prev = { files: get().files, folders: get().folders };
    const fileIds = new Set(items.filter((i) => i.type === "file").map((i) => i.id));
    const folderIds = new Set(items.filter((i) => i.type === "folder").map((i) => i.id));
    set({
      files: prev.files.filter((f) => !fileIds.has(f.id)),
      folders: prev.folders.filter((f) => !folderIds.has(f.id)),
    });
    get().clearSelection();
    try {
      await filesApi.bulkMove(items, targetFolderId);
    } catch (err) {
      set({ files: prev.files, folders: prev.folders });
      throw err;
    }
  },

  bulkDelete: async (items) => {
    await filesApi.bulkDelete(items);
    await Promise.all([get().fetchContents(get().currentFolderId), get().fetchStorage()]);
    get().clearSelection();
  },

  toggleSelect: (key) => {
    const next = new Set(get().selectedItems);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    set({ selectedItems: next, lastSelectedId: key });
  },

  rangeSelect: (key, allKeys) => {
    const lastId = get().lastSelectedId;
    if (!lastId) {
      const next = new Set(get().selectedItems);
      next.add(key);
      set({ selectedItems: next, lastSelectedId: key });
      return;
    }
    const fromIdx = allKeys.indexOf(lastId);
    const toIdx = allKeys.indexOf(key);
    if (fromIdx === -1 || toIdx === -1) {
      const next = new Set(get().selectedItems);
      next.add(key);
      set({ selectedItems: next, lastSelectedId: key });
      return;
    }
    const [start, end] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
    const next = new Set(get().selectedItems);
    for (let i = start; i <= end; i++) {
      next.add(allKeys[i]);
    }
    set({ selectedItems: next, lastSelectedId: key });
  },

  selectAll: (allKeys) => {
    set({ selectedItems: new Set(allKeys), lastSelectedId: null });
  },

  clearSelection: () => set({ selectedItems: new Set(), lastSelectedId: null }),
}));
