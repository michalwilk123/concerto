"use client";

import { useTranslation } from "@/hooks/useTranslation";
import type { FileWithUrl, FolderDoc } from "@/types/files";
import { UnifiedFileRow } from "./UnifiedFileRow";

interface UnifiedFileListProps {
  folders: FolderDoc[];
  files: FileWithUrl[];
  selectedItems: Set<string>;
  readOnly: boolean;
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

  const isEmpty = folders.length === 0 && files.length === 0;
  const allKeys = [
    ...folders.map((f) => `folder:${f.id}`),
    ...files.map((f) => `file:${f.id}`),
  ];
  const allSelected = allKeys.length > 0 && allKeys.every((k) => selectedItems.has(k));

  const headerStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "28px 28px 1fr 110px 110px 70px 36px",
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

  return (
    <div>
      {/* Header */}
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
        <div />
      </div>

      {/* Rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 1, paddingTop: 2 }}>
        {isEmpty ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-tertiary)", fontSize: "0.875rem" }}>
            {t("fileList.empty")}
          </div>
        ) : (
          <>
            {folders.map((folder) => (
              <UnifiedFileRow
                key={folder.id}
                type="folder"
                item={folder}
                isSelected={selectedItems.has(`folder:${folder.id}`)}
                readOnly={readOnly}
                onCheckboxChange={(e) => onToggleSelect(`folder:${folder.id}`, e)}
                onClick={() => onNavigateToFolder(folder.id)}
                onDelete={() => onDeleteFolder(folder.id)}
                onRename={folder.isSystem ? undefined : (name) => onRenameFolder(folder.id, name)}
              />
            ))}
            {files.map((file) => (
              <UnifiedFileRow
                key={file.id}
                type="file"
                item={file}
                isSelected={selectedItems.has(`file:${file.id}`)}
                readOnly={readOnly}
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
