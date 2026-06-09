"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { ChevronDown, ChevronRight, Folder, GripVertical } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";
import { getFileIcon } from "@/lib/file-icons";
import { logVisualBoolean, logVisualRange } from "@/lib/visual-debug";
import type { FileWithUrl, FolderDoc } from "@/types/files";

// Sum of fixed/min track widths in the non-compact grid template below.
const ROW_MIN_GRID_WIDTH = 28 + 28 + 0 + 110 + 110 + 70 + 144;

// Indent applied to the name cell per nesting level in the inline folder tree.
const TREE_INDENT = 16;
// Fixed width reserved for the expand chevron / file spacer so names line up.
const CHEVRON_WIDTH = 18;

interface UnifiedFileRowProps {
  type: "file" | "folder";
  item: FileWithUrl | FolderDoc;
  isSelected: boolean;
  isDragOverlay?: boolean;
  readOnly: boolean;
  compact?: boolean;
  /** Render inline tree controls (expand chevron + per-depth indent) regardless of `compact`. */
  tree?: boolean;
  depth?: number;
  expanded?: boolean;
  childrenLoading?: boolean;
  onToggleExpand?: () => void;
  onCheckboxChange: (e: React.MouseEvent) => void;
  onClick: () => void;
  onDelete: () => void;
  onRename?: (newName: string) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function UnifiedFileRow({
  type,
  item,
  isSelected,
  isDragOverlay = false,
  readOnly,
  compact = false,
  tree,
  depth = 0,
  expanded = false,
  childrenLoading = false,
  onToggleExpand,
  onCheckboxChange,
  onClick,
  onDelete,
  onRename,
}: UnifiedFileRowProps) {
  const { t } = useTranslation();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(item.name);

  const dndId = `${type}:${item.id}`;
  const isFolder = type === "folder";
  const file = !isFolder ? (item as FileWithUrl) : null;
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (compact || isDragOverlay) return;
    const row = rowRef.current;
    if (!row) return;
    let animationFrame = 0;

    const logLayout = () => {
      const rect = row.getBoundingClientRect();
      if (!row.isConnected || rect.width === 0 || rect.height === 0) return;

      // The grid has a hard min-width floor; in a narrow pane it overflows the row box.
      logVisualBoolean(
        "UnifiedFileRow",
        "row overflows its container",
        row.scrollWidth > row.clientWidth + 1,
        false,
        {
          scrollWidth: row.scrollWidth,
          clientWidth: row.clientWidth,
          gridMinWidth: ROW_MIN_GRID_WIDTH,
        },
      );
      logVisualRange("UnifiedFileRow", {
        label: "row width vs grid min",
        value: rect.width,
        min: ROW_MIN_GRID_WIDTH,
        max: window.innerWidth,
      });
      // Fixed 44px row height — content taller than this clips.
      logVisualRange("UnifiedFileRow", {
        label: "row height",
        value: rect.height,
        min: 40,
        max: 48,
      });
      const nameSpan = row.querySelector("[data-file-name]");
      if (nameSpan) {
        logVisualRange(
          "UnifiedFileRow",
          {
            label: "name truncated (hidden px)",
            value: Math.max(0, nameSpan.scrollWidth - nameSpan.clientWidth),
            min: 0,
            max: 0,
          },
          { name: item.name },
        );
      }
    };

    const scheduleLogLayout = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(logLayout);
    };

    scheduleLogLayout();
    const resizeObserver = new ResizeObserver(scheduleLogLayout);
    resizeObserver.observe(row);
    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
    };
  }, [compact, isDragOverlay, item.name]);

  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: dndId,
    disabled: compact || isDragOverlay || isEditing,
    data: { type, item },
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop:${dndId}`,
    disabled: compact || type !== "folder" || isDragOverlay,
    data: { type: "folder", folderId: item.id },
  });

  const combinedRef = (el: HTMLDivElement | null) => {
    rowRef.current = el;
    setDragRef(el);
    if (isFolder) setDropRef(el);
  };

  const Icon = isFolder ? Folder : getFileIcon(file!.mimeType);
  const iconColor = isFolder ? "var(--accent-primary)" : "var(--text-tertiary)";

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

  const commitRename = () => {
    const trimmed = editValue.trim();
    setIsEditing(false);
    if (trimmed && trimmed !== item.name) {
      onRename?.(trimmed);
    } else {
      setEditValue(item.name);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") commitRename();
    if (e.key === "Escape") {
      setEditValue(item.name);
      setIsEditing(false);
    }
  };

  const showActions = !readOnly && !isEditing;

  // Inline tree controls: per-depth indent plus an expand chevron for folders,
  // or a matching spacer for files so names stay aligned. Driven by the explicit
  // `tree` flag when provided (so the compact meeting browsers can be trees too);
  // otherwise defaults to the non-compact dashboard behavior.
  const showTreeControls = tree ?? !compact;
  const Chevron = expanded ? ChevronDown : ChevronRight;
  const chevronOrSpacer = !showTreeControls ? null : isFolder && onToggleExpand ? (
    <button
      type="button"
      aria-label={expanded ? "Collapse folder" : "Expand folder"}
      onClick={(e) => {
        e.stopPropagation();
        onToggleExpand();
      }}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: CHEVRON_WIDTH,
        height: CHEVRON_WIDTH,
        flexShrink: 0,
        padding: 0,
        border: "none",
        background: "transparent",
        cursor: "pointer",
        color: childrenLoading ? "var(--text-tertiary)" : "var(--text-secondary)",
        opacity: childrenLoading ? 0.5 : 1,
      }}
    >
      <Chevron size={14} />
    </button>
  ) : (
    <span style={{ width: CHEVRON_WIDTH, flexShrink: 0 }} />
  );

  const nameCell = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        minWidth: 0,
        flex: 1,
        paddingLeft: showTreeControls ? depth * TREE_INDENT : 0,
      }}
      onClick={isEditing ? undefined : onClick}
    >
      {chevronOrSpacer}
      <Icon
        size={16}
        style={{ color: iconColor, flexShrink: 0 }}
        fill={isFolder ? "color-mix(in srgb, var(--accent-primary) 15%, transparent)" : "none"}
      />
      {isEditing ? (
        <input
          autoFocus
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commitRename}
          onClick={(e) => e.stopPropagation()}
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: "0.875rem",
            fontWeight: isFolder ? 500 : 400,
            color: "var(--text-primary)",
            background: "var(--bg-primary)",
            border: "1px solid var(--accent-primary)",
            borderRadius: "var(--radius-sm)",
            padding: "2px 6px",
            outline: "none",
          }}
        />
      ) : (
        <span
          data-file-name
          title={item.name}
          style={{
            fontSize: "0.875rem",
            fontWeight: isFolder ? 500 : 400,
            color: "var(--text-primary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            cursor: "pointer",
          }}
        >
          {item.name}
        </span>
      )}
    </div>
  );

  const actionButtons = (
    // Stop row-action clicks from bubbling to the row's onClick (open/navigate);
    // ButtonGroup item handlers receive no event, so propagation is stopped here on the wrapper.
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: 2,
        flexShrink: 0,
        paddingLeft: 8,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {showActions && (
        <>
          {onRename ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditValue(item.name);
                setIsEditing(true);
              }}
            >
              {t("fileItem.rename")}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
          >
            {t("files.delete")}
          </Button>
        </>
      )}
    </div>
  );

  if (compact) {
    return (
      <>
        <div
          ref={combinedRef}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 0,
            height: 36,
            padding: "0 8px",
            background: rowBg,
            border: rowBorder,
            borderRadius: "var(--radius-sm)",
            cursor: "pointer",
            opacity: isDragging ? 0.4 : 1,
            transition: "background 0.1s, border-color 0.1s",
            userSelect: isEditing ? "text" : "none",
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {nameCell}
          {actionButtons}
        </div>

        <ConfirmDialog
          open={showDeleteConfirm}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={() => {
            setShowDeleteConfirm(false);
            onDelete();
          }}
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

  return (
    <>
      <div
        ref={combinedRef}
        style={{
          display: "grid",
          gridTemplateColumns: "28px 28px minmax(0, 1fr) 110px 110px 70px 144px",
          alignItems: "center",
          gap: 0,
          height: 44,
          padding: "0 8px",
          background: rowBg,
          border: rowBorder,
          borderRadius: "var(--radius-sm)",
          cursor: isDragging ? "grabbing" : isEditing ? "text" : isFolder ? "pointer" : "default",
          opacity: isDragging ? 0.4 : 1,
          transition: "background 0.1s, border-color 0.1s",
          userSelect: isEditing ? "text" : "none",
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
            cursor: isEditing ? "default" : "grab",
            color: hovered && !isEditing ? "var(--text-tertiary)" : "transparent",
            transition: "color 0.1s",
            flexShrink: 0,
          }}
        >
          <GripVertical size={14} />
        </div>

        {/* Checkbox */}
        <div
          style={{ display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          onClick={(e) => {
            e.stopPropagation();
            if (!isEditing) onCheckboxChange(e);
          }}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => {}}
            style={{
              cursor: "pointer",
              width: 15,
              height: 15,
              accentColor: "var(--accent-primary)",
            }}
          />
        </div>

        {/* Name */}
        {nameCell}

        {/* Date */}
        <div
          style={{
            fontSize: "0.8125rem",
            color: "var(--text-secondary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {formatDate(item.createdAt)}
        </div>

        {/* Author */}
        <div
          title={file?.uploadedByName || t("fileList.unknownAuthor")}
          style={{
            fontSize: "0.8125rem",
            color: "var(--text-secondary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {file?.uploadedByName || t("fileList.unknownAuthor")}
        </div>

        {/* Size */}
        <div
          style={{
            fontSize: "0.8125rem",
            color: "var(--text-secondary)",
            textAlign: "right",
            paddingRight: 4,
          }}
        >
          {!isFolder ? formatSize((item as FileWithUrl).size) : "-"}
        </div>

        {/* Actions */}
        {actionButtons}
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          setShowDeleteConfirm(false);
          onDelete();
        }}
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
