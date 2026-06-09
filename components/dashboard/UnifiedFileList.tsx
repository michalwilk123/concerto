"use client";

import { Fragment } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import type { FileWithUrl, FolderDoc } from "@/types/files";
import { UnifiedFileRow } from "./UnifiedFileRow";

interface FolderChildren {
  folders: FolderDoc[];
  files: FileWithUrl[];
  loading: boolean;
}

interface UnifiedFileListProps {
  folders: FolderDoc[];
  files: FileWithUrl[];
  selectedItems: Set<string>;
  readOnly: boolean;
  compact?: boolean;
  expandedFolders?: Set<string>;
  folderChildren?: Record<string, FolderChildren>;
  onToggleExpand?: (folderId: string) => void;
  onNavigateToFolder: (folderId: string) => void;
  onPreviewFile: (file: FileWithUrl) => void;
  onDeleteFile: (id: string) => void;
  onDeleteFolder: (id: string) => void;
  onRenameFile: (id: string, name: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onToggleSelect: (key: string, e: React.MouseEvent) => void;
  onSelectAll: () => void;
}

export function UnifiedFileList({
  folders,
  files,
  selectedItems,
  readOnly,
  compact = false,
  expandedFolders,
  folderChildren,
  onToggleExpand,
  onNavigateToFolder,
  onPreviewFile,
  onDeleteFile,
  onDeleteFolder,
  onRenameFile,
  onRenameFolder,
  onToggleSelect,
  onSelectAll,
}: UnifiedFileListProps) {
  const { t } = useTranslation();
  // Inline tree is enabled wherever the expand props are supplied — including the
  // compact meeting browsers, not just the non-compact dashboard view.
  const treeEnabled = !!expandedFolders && !!folderChildren && !!onToggleExpand;

  const isEmpty = folders.length === 0 && files.length === 0;
  const allKeys = [
    ...folders.map((f) => `folder:${f.id}`),
    ...files.map((f) => `file:${f.id}`),
  ];
  const allSelected = allKeys.length > 0 && allKeys.every((k) => selectedItems.has(k));

  const headerStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "28px 28px minmax(0, 1fr) 110px 110px 70px 144px",
    alignItems: "center",
    gap: 0,
    height: 36,
    padding: "0 8px",
    borderBottom: "1px solid var(--border-subtle)",
    position: "sticky",
    top: 0,
    background: "var(--bg-primary)",
    zIndex: 1,
  };

  const colHeaderStyle: React.CSSProperties = {
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "var(--text-tertiary)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };

  const hintStyle = (depth: number): React.CSSProperties => ({
    paddingTop: 6,
    paddingBottom: 6,
    paddingRight: 8,
    // Align under child names: chevron+icon offset, plus the checkbox column when
    // it's shown (non-compact only).
    paddingLeft: 8 + depth * 16 + (compact ? 26 : 34),
    fontSize: "0.8125rem",
    color: "var(--text-tertiary)",
  });

  const renderFileRow = (file: FileWithUrl, depth: number) => (
    <UnifiedFileRow
      key={`file:${file.id}`}
      type="file"
      item={file}
      isSelected={selectedItems.has(`file:${file.id}`)}
      readOnly={readOnly}
      compact={compact}
      tree
      depth={depth}
      onCheckboxChange={(e) => onToggleSelect(`file:${file.id}`, e)}
      onClick={() => onPreviewFile(file)}
      onDelete={() => onDeleteFile(file.id)}
      onRename={(name) => onRenameFile(file.id, name)}
    />
  );

  const renderFolderNode = (folder: FolderDoc, depth: number) => {
    const expanded = expandedFolders!.has(folder.id);
    const child = folderChildren![folder.id];
    const isLoading = !child || child.loading;
    const isEmptyChild =
      !!child && !child.loading && child.folders.length === 0 && child.files.length === 0;
    return (
      <Fragment key={`folder:${folder.id}`}>
        <UnifiedFileRow
          type="folder"
          item={folder}
          isSelected={selectedItems.has(`folder:${folder.id}`)}
          readOnly={readOnly}
          compact={compact}
          tree
          depth={depth}
          expanded={expanded}
          childrenLoading={!!child?.loading}
          onToggleExpand={() => onToggleExpand!(folder.id)}
          onCheckboxChange={(e) => onToggleSelect(`folder:${folder.id}`, e)}
          onClick={() => onNavigateToFolder(folder.id)}
          onDelete={() => onDeleteFolder(folder.id)}
          onRename={(name) => onRenameFolder(folder.id, name)}
        />
        {expanded && (
          <>
            {child?.folders.map((f) => renderFolderNode(f, depth + 1))}
            {child?.files.map((f) => renderFileRow(f, depth + 1))}
            {isLoading && <div style={hintStyle(depth + 1)}>…</div>}
            {isEmptyChild && <div style={hintStyle(depth + 1)}>{t("fileList.empty")}</div>}
          </>
        )}
      </Fragment>
    );
  };

  return (
    <div>
      {/* Header — hidden in compact mode */}
      {!compact && (
        <div style={headerStyle}>
          <div />
          {/* Select-all checkbox */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            {!readOnly && allKeys.length > 0 && (
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onSelectAll}
                style={{ cursor: "pointer", width: 15, height: 15, accentColor: "var(--accent-primary)" }}
                title="Select all"
              />
            )}
          </div>
          <div style={colHeaderStyle}>{t("fileList.colName")}</div>
          <div style={colHeaderStyle}>{t("fileList.colDate")}</div>
          <div style={colHeaderStyle}>{t("fileList.colAuthor")}</div>
          <div style={{ ...colHeaderStyle, textAlign: "right", paddingRight: 4 }}>{t("fileList.colSize")}</div>
          <div style={{ ...colHeaderStyle, paddingLeft: 8 }}>{t("fileList.colActions")}</div>
        </div>
      )}

      {/* Rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 1, paddingTop: 2 }}>
        {isEmpty ? (
          <div style={{ textAlign: "center", padding: compact ? "24px 0" : "48px 0", color: "var(--text-tertiary)", fontSize: "0.875rem" }}>
            {t("fileList.empty")}
          </div>
        ) : treeEnabled ? (
          <>
            {folders.map((folder) => renderFolderNode(folder, 0))}
            {files.map((file) => renderFileRow(file, 0))}
          </>
        ) : (
          <>
            {folders.map((folder) => (
              <UnifiedFileRow
                key={folder.id}
                type="folder"
                item={folder}
                isSelected={selectedItems.has(`folder:${folder.id}`)}
                readOnly={readOnly}
                compact={compact}
                onCheckboxChange={(e) => onToggleSelect(`folder:${folder.id}`, e)}
                onClick={() => onNavigateToFolder(folder.id)}
                onDelete={() => onDeleteFolder(folder.id)}
                onRename={(name) => onRenameFolder(folder.id, name)}
              />
            ))}
            {files.map((file) => (
              <UnifiedFileRow
                key={file.id}
                type="file"
                item={file}
                isSelected={selectedItems.has(`file:${file.id}`)}
                readOnly={readOnly}
                compact={compact}
                onCheckboxChange={(e) => onToggleSelect(`file:${file.id}`, e)}
                onClick={() => onPreviewFile(file)}
                onDelete={() => onDeleteFile(file.id)}
                onRename={(name) => onRenameFile(file.id, name)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
