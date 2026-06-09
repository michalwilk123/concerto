"use client";

import { useDroppable } from "@dnd-kit/core";
import { ArrowUp } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import type { FolderDoc } from "@/types/files";

interface ParentDirButtonProps {
  /** Trail from root to the current folder, current folder last (empty at root). */
  ancestors: FolderDoc[];
  compact?: boolean;
  onNavigate: (folderId: string | null) => void;
}

/**
 * Replaces the full breadcrumb trail in the meeting file browsers with a single
 * "go up one level" control plus the current folder's name for orientation.
 * Doubles as a drag-and-drop target: dropping items moves them to the parent,
 * reusing FileBrowserPanel's existing `breadcrumb:*` drop handling.
 */
export function ParentDirButton({ ancestors, compact = false, onNavigate }: ParentDirButtonProps) {
  const { t } = useTranslation();

  const isAtRoot = ancestors.length === 0;
  const currentName = ancestors.at(-1)?.name ?? t("breadcrumbs.myFiles");
  // Parent of the current folder: second-to-last ancestor, or root (null).
  const parentId = ancestors.length >= 2 ? ancestors[ancestors.length - 2].id : null;

  const { setNodeRef, isOver } = useDroppable({
    id: parentId ? `breadcrumb:${parentId}` : "breadcrumb:root",
    data: { type: "breadcrumb", folderId: parentId },
    disabled: isAtRoot,
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: compact ? 6 : 8,
        fontSize: "0.875rem",
        minWidth: 0,
        overflow: "hidden",
      }}
    >
      <button
        ref={setNodeRef}
        type="button"
        onClick={() => onNavigate(parentId)}
        disabled={isAtRoot}
        title={t("breadcrumbs.parent")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          flexShrink: 0,
          padding: "4px 8px",
          borderRadius: "var(--radius-sm)",
          color: isAtRoot ? "var(--text-tertiary)" : "var(--text-secondary)",
          background: isOver
            ? "color-mix(in srgb, var(--accent-primary) 12%, transparent)"
            : "none",
          border: isOver ? "1px solid var(--accent-primary)" : "1px solid transparent",
          cursor: isAtRoot ? "default" : "pointer",
          fontWeight: 500,
          transition: "background 0.1s, border-color 0.1s",
        }}
      >
        <ArrowUp size={16} />
        <span>{t("breadcrumbs.parent")}</span>
      </button>

      <span
        title={currentName}
        style={{
          color: "var(--text-primary)",
          fontWeight: 500,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          minWidth: 0,
        }}
      >
        {currentName}
      </span>
    </div>
  );
}
