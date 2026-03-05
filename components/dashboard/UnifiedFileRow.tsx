"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Folder, GripVertical, Trash2 } from "lucide-react";
import { useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useTranslation } from "@/hooks/useTranslation";
import { getFileIcon } from "@/lib/file-icons";
import type { FileWithUrl, FolderDoc } from "@/types/files";

interface UnifiedFileRowProps {
  type: "file" | "folder";
  item: FileWithUrl | FolderDoc;
  isSelected: boolean;
  isDragOverlay?: boolean;
  readOnly: boolean;
  onCheckboxChange: (e: React.MouseEvent) => void;
  onClick: () => void;
  onDelete: () => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function UnifiedFileRow({
  type,
  item,
  isSelected,
  isDragOverlay = false,
  readOnly,
  onCheckboxChange,
  onClick,
  onDelete,
}: UnifiedFileRowProps) {
  const { t } = useTranslation();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hovered, setHovered] = useState(false);

  const dndId = `${type}:${item.id}`;
  const isSystemFolder = type === "folder" && (item as FolderDoc).isSystem;

  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: dndId,
    disabled: isSystemFolder || isDragOverlay,
    data: { type, item },
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop:${dndId}`,
    disabled: type !== "folder" || isDragOverlay,
    data: { type: "folder", folderId: item.id },
  });

  const isFolder = type === "folder";
  const folder = isFolder ? (item as FolderDoc) : null;
  const file = !isFolder ? (item as FileWithUrl) : null;

  const Icon = isFolder ? Folder : getFileIcon(file!.mimeType);
  const iconColor = isFolder
    ? "var(--accent-primary)"
    : "var(--text-tertiary)";

  const rowBg = isDragging
    ? "transparent"
    : isOver
      ? "var(--bg-elevated)"
      : isSelected
        ? "color-mix(in srgb, var(--accent-primary) 8%, transparent)"
        : hovered
          ? "var(--bg-secondary)"
          : "transparent";

  const rowBorder = isOver
    ? "1px solid var(--accent-primary)"
    : isSelected
      ? "1px solid color-mix(in srgb, var(--accent-primary) 30%, transparent)"
      : "1px solid transparent";

  // Combine drag + drop refs for folder rows
  const combinedRef = (el: HTMLElement | null) => {
    setDragRef(el);
    if (isFolder) setDropRef(el);
  };

  return (
    <>
      <div
        ref={combinedRef}
        style={{
          display: "grid",
          gridTemplateColumns: "28px 28px 1fr 110px 110px 70px 36px",
          alignItems: "center",
          gap: 0,
          height: 44,
          padding: "0 8px",
          background: rowBg,
          border: rowBorder,
          borderRadius: "var(--radius-sm)",
          cursor: isDragging ? "grabbing" : isFolder ? "pointer" : "default",
          opacity: isDragging ? 0.4 : 1,
          transition: "background 0.1s, border-color 0.1s",
          userSelect: "none",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: isSystemFolder ? "default" : "grab",
            color: hovered && !isSystemFolder ? "var(--text-tertiary)" : "transparent",
            transition: "color 0.1s",
            flexShrink: 0,
          }}
        >
          {!isSystemFolder && <GripVertical size={14} />}
        </div>

        {/* Checkbox */}
        <div
          style={{ display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          onClick={(e) => { e.stopPropagation(); onCheckboxChange(e); }}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => {}}
            style={{ cursor: "pointer", width: 15, height: 15, accentColor: "var(--accent-primary)" }}
          />
        </div>

        {/* Name */}
        <div
          style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, paddingRight: 8 }}
          onClick={onClick}
        >
          <Icon
            size={16}
            style={{ color: iconColor, flexShrink: 0 }}
            fill={isFolder ? "color-mix(in srgb, var(--accent-primary) 15%, transparent)" : "none"}
          />
          <span
            style={{
              fontSize: "0.875rem",
              fontWeight: isFolder ? 500 : 400,
              color: "var(--text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              cursor: isFolder ? "pointer" : "default",
            }}
          >
            {item.name}
          </span>
          {isSystemFolder && (
            <span style={{
              fontSize: "0.65rem",
              fontWeight: 500,
              color: "var(--text-tertiary)",
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              padding: "1px 5px",
              flexShrink: 0,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}>
              system
            </span>
          )}
        </div>

        {/* Date */}
        <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {formatDate(item.createdAt)}
        </div>

        {/* Author */}
        <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {!isFolder && (item as FileWithUrl).uploadedByName
            ? (item as FileWithUrl).uploadedByName
            : t("fileList.unknownAuthor")}
        </div>

        {/* Size */}
        <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", textAlign: "right", paddingRight: 4 }}>
          {!isFolder ? formatSize((item as FileWithUrl).size) : ""}
        </div>

        {/* Delete */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          {!readOnly && !isSystemFolder && (hovered || isSelected) && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
              style={{
                background: "none",
                border: "none",
                padding: 4,
                cursor: "pointer",
                color: "var(--accent-red)",
                borderRadius: "var(--radius-sm)",
                display: "flex",
                alignItems: "center",
              }}
              title={t("files.delete")}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={() => { setShowDeleteConfirm(false); onDelete(); }}
        title={isFolder ? t("folders.deleteTitle") : t("fileItem.deleteTitle")}
        message={
          isFolder
            ? t("folders.deleteMessage", { name: item.name })
            : t("fileItem.deleteMessage", { name: item.name })
        }
        confirmLabel={isFolder ? t("folders.delete") : t("fileItem.delete")}
        variant="danger"
      />
    </>
  );
}
