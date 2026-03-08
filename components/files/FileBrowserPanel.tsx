"use client";

import { DndContext, DragOverlay, type DragEndEvent, type DragStartEvent, PointerSensor, pointerWithin, useSensor, useSensors } from "@dnd-kit/core";
import { FolderPlus } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { BulkActionBar } from "@/components/dashboard/BulkActionBar";
import { Breadcrumbs } from "@/components/dashboard/Breadcrumbs";
import { CreateFolderModal } from "@/components/dashboard/CreateFolderModal";
import { FileUploader } from "@/components/dashboard/FileUploader";
import { LoadingSkeleton } from "@/components/dashboard/LoadingSkeleton";
import { UnifiedFileList } from "@/components/dashboard/UnifiedFileList";
import { UnifiedFileRow } from "@/components/dashboard/UnifiedFileRow";
import { FilePreviewModal } from "@/components/dashboard/preview/FilePreviewModal";
import { useToast } from "@/components/Toast";
import { InlineButton } from "@/components/ui/inline-button";
import { meetingFoldersApi } from "@/lib/api-client";
import { buildDashboardUrl } from "@/lib/dashboard-url";
import { useFileManagerStore } from "@/stores/file-manager-store";
import { useTranslation } from "@/hooks/useTranslation";
import type { FileWithUrl, FolderDoc } from "@/types/files";

interface FileBrowserPanelProps {
  allowManage: boolean;
  showCreateFolderButton?: boolean;
  compact?: boolean;
  groupId: string;
  meetingId?: string;
  ancestors: FolderDoc[];
  folderId?: string | null;
  initialFolderId?: string;
}

export function FileBrowserPanel({
  allowManage,
  showCreateFolderButton = true,
  compact = false,
  groupId,
  meetingId,
  ancestors: ancestorsProp,
  folderId: folderIdProp,
  initialFolderId,
}: FileBrowserPanelProps) {
  const router = useRouter();
  const toast = useToast();
  const { t } = useTranslation();
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [activeDragItem, setActiveDragItem] = useState<{ type: "file" | "folder"; item: FileWithUrl | FolderDoc } | null>(null);

  // Local state for meeting-mode navigation
  const [localFolderId, setLocalFolderId] = useState<string | null>(null);
  const [localAncestors, setLocalAncestors] = useState<FolderDoc[]>([]);

  const {
    files,
    folders,
    currentFolderId,
    currentGroupId,
    currentMeetingId,
    previewFile,
    isLoading,
    hasFetched,
    selectedItems,
    setCurrentGroupId,
    setCurrentMeetingId,
    setCurrentFolderId,
    setPreviewFile,
    fetchContents,
    deleteFile,
    renameFile,
    renameFolder,
    createFolder,
    deleteFolder,
    moveFile,
    moveFolder,
    bulkMove,
    bulkDelete,
    toggleSelect,
    rangeSelect,
    selectAll,
    clearSelection,
  } = useFileManagerStore();

  // Init: sync group/meeting to store
  useEffect(() => {
    if (meetingId) {
      if (currentMeetingId !== meetingId) {
        setCurrentMeetingId(meetingId);
        setLocalFolderId(null);
        setLocalAncestors([]);
        fetchContents(null);
      }
    } else {
      if (!initialFolderId) return;
      if (currentGroupId !== groupId) {
        setCurrentGroupId(groupId);
      }
      setCurrentFolderId(initialFolderId);
      fetchContents(initialFolderId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId, initialFolderId, groupId]);

  // Clean up meeting context on unmount
  useEffect(() => {
    if (!meetingId) return;
    return () => {
      // Don't reset if we're still in the same meeting context
    };
  }, [meetingId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  // Active folder/ancestors: meeting mode uses local state, group mode uses props/store
  const activeFolderId = meetingId ? localFolderId : (folderIdProp !== undefined ? folderIdProp : currentFolderId);
  const activeAncestors = meetingId ? localAncestors : ancestorsProp;

  const allKeys = [
    ...folders.map((f) => `folder:${f.id}`),
    ...files.map((f) => `file:${f.id}`),
  ];

  const handleNavigateToFolder = async (folderId: string | null) => {
    if (meetingId) {
      setLocalFolderId(folderId);
      setCurrentFolderId(folderId);
      fetchContents(folderId);
      if (folderId) {
        try {
          const anc = await meetingFoldersApi.getAncestors(folderId);
          setLocalAncestors(anc);
        } catch {
          setLocalAncestors([]);
        }
      } else {
        setLocalAncestors([]);
      }
    } else {
      router.push(buildDashboardUrl(groupId, { folderId }));
    }
  };

  const handleUploadComplete = () => {
    fetchContents(activeFolderId);
    toast.success(t("files.uploadSuccess"));
  };

  const handleDeleteFile = async (id: string) => {
    try {
      await deleteFile(id);
      toast.success(t("files.deleteSuccess"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("files.deleteFailed"));
    }
  };

  const handleRenameFile = async (id: string, name: string) => {
    try {
      await renameFile(id, name);
      toast.success(t("files.renameSuccess"));
    } catch (err) {
      if (err instanceof Error && /already exists/i.test(err.message)) {
        toast.error(t("files.renameNameUnavailable", { name }));
        return;
      }
      toast.error(err instanceof Error ? err.message : t("files.renameFailed"));
    }
  };

  const handleRenameFolder = async (id: string, name: string) => {
    try {
      await renameFolder(id, name);
      toast.success(t("fileList.folderRenameSuccess"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("fileList.folderRenameFailed"));
    }
  };

  const handleDeleteFolder = async (id: string) => {
    try {
      await deleteFolder(id);
      toast.success(t("files.folderDeleteSuccess"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("files.deleteFailed"));
    }
  };

  const handleCreateFolder = async (name: string) => {
    try {
      await createFolder(name, activeFolderId);
      toast.success(t("files.createFolderSuccess", { name }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("files.createFolderFailed"));
    }
  };

  const handleBulkDelete = async () => {
    const items = Array.from(selectedItems).map((key) => {
      const [type, ...rest] = key.split(":");
      return { type: type as "file" | "folder", id: rest.join(":") };
    });
    try {
      await bulkDelete(items);
      toast.success(t("fileList.bulkDeleteSuccess", { count: String(items.length) }));
    } catch {
      toast.error(t("fileList.bulkDeleteFailed"));
    }
  };

  const handleToggleSelect = (key: string, e: React.MouseEvent) => {
    if (e.shiftKey) {
      rangeSelect(key, allKeys);
    } else {
      toggleSelect(key);
    }
  };

  const handleSelectAll = () => {
    const allSelected = allKeys.every((k) => selectedItems.has(k));
    if (allSelected) {
      clearSelection();
    } else {
      selectAll(allKeys);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as { type: "file" | "folder"; item: FileWithUrl | FolderDoc } | undefined;
    if (data) setActiveDragItem(data);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragItem(null);
    const { active, over } = event;
    if (!over) return;

    const activeKey = active.id as string;
    const [activeType, ...activeIdParts] = activeKey.split(":");
    const activeId = activeIdParts.join(":");

    let targetFolderId: string | null = null;
    const overData = over.data.current as { type: string; folderId?: string } | undefined;

    if (over.id === "breadcrumb:root") {
      targetFolderId = null;
    } else if (typeof over.id === "string" && over.id.startsWith("breadcrumb:")) {
      targetFolderId = over.id.replace("breadcrumb:", "");
    } else if (overData?.type === "folder") {
      targetFolderId = overData.folderId as string;
      if (targetFolderId === activeId && activeType === "folder") return;
    } else {
      return;
    }

    const isBulkDrag = selectedItems.has(activeKey) && selectedItems.size > 1;

    try {
      if (isBulkDrag) {
        const items = Array.from(selectedItems).map((key) => {
          const [type, ...rest] = key.split(":");
          return { type: type as "file" | "folder", id: rest.join(":") };
        });
        await bulkMove(items, targetFolderId);
        toast.success(t("fileList.moveSuccess"));
      } else if (activeType === "file") {
        await moveFile(activeId, targetFolderId);
        toast.success(t("fileList.moveSuccess"));
      } else if (activeType === "folder") {
        await moveFolder(activeId, targetFolderId);
        toast.success(t("fileList.moveSuccess"));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("already exists")) {
        toast.error(t("fileList.moveCollision"));
      } else {
        toast.error(t("fileList.moveFailed"));
      }
    }
  };

  const dragCount = activeDragItem
    ? selectedItems.has(`${activeDragItem.type}:${activeDragItem.item.id}`) && selectedItems.size > 1
      ? selectedItems.size
      : 1
    : 0;

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div style={{ padding: compact ? "var(--space-md)" : 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 24,
            }}
          >
            <Breadcrumbs
              groupId={groupId}
              ancestors={activeAncestors}
              onNavigate={meetingId ? (folderId) => handleNavigateToFolder(folderId) : undefined}
            />
            {allowManage && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <FileUploader
                  groupId={groupId}
                  meetingId={meetingId}
                  folderId={activeFolderId}
                  onUploadComplete={handleUploadComplete}
                />
                {showCreateFolderButton && (
                  <InlineButton
                    variant="accent"
                    size="md"
                    onClick={() => setShowCreateFolder(true)}
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <FolderPlus size={16} />
                    {t("files.newFolder")}
                  </InlineButton>
                )}
              </div>
            )}
          </div>

          {isLoading && !hasFetched ? (
            <LoadingSkeleton />
          ) : (
            <UnifiedFileList
              folders={folders}
              files={files}
              selectedItems={selectedItems}
              readOnly={!allowManage}
              onNavigateToFolder={(id) => handleNavigateToFolder(id)}
              onPreviewFile={(file) => setPreviewFile(file)}
              onDeleteFile={handleDeleteFile}
              onDeleteFolder={handleDeleteFolder}
              onRenameFile={handleRenameFile}
              onRenameFolder={handleRenameFolder}
              onToggleSelect={handleToggleSelect}
              onSelectAll={handleSelectAll}
            />
          )}
        </div>

        <DragOverlay>
          {activeDragItem && (
            <div style={{ position: "relative" }}>
              <UnifiedFileRow
                type={activeDragItem.type}
                item={activeDragItem.item}
                isSelected={false}
                isDragOverlay
                readOnly
                onCheckboxChange={() => {}}
                onClick={() => {}}
                onDelete={() => {}}
              />
              {dragCount > 1 && (
                <div style={{
                  position: "absolute",
                  top: -6,
                  right: -6,
                  background: "var(--accent-primary)",
                  color: "#fff",
                  borderRadius: "50%",
                  width: 20,
                  height: 20,
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  {dragCount}
                </div>
              )}
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {allowManage && showCreateFolderButton && (
        <CreateFolderModal
          isOpen={showCreateFolder}
          onClose={() => setShowCreateFolder(false)}
          onSubmit={handleCreateFolder}
        />
      )}

      <FilePreviewModal
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        fileName={previewFile?.name ?? ""}
        fileUrl={previewFile?.url ?? null}
        mimeType={previewFile?.mimeType ?? ""}
      />

      {allowManage && (
        <BulkActionBar
          count={selectedItems.size}
          onClear={clearSelection}
          onDelete={handleBulkDelete}
        />
      )}
    </>
  );
}
