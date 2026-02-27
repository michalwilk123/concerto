"use client";

import { Download, File, Trash2 } from "lucide-react";
import { useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { InlineButton } from "@/components/ui/inline-button";
import { useTranslation } from "@/hooks/useTranslation";
import type { FileWithUrl } from "@/types/files";
import { canPreview } from "./preview/PreviewRegistry";

interface FileItemProps {
  file: FileWithUrl;
  onPreview: (file: FileWithUrl) => void;
  onDelete: (id: string) => void;
  readOnly?: boolean;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileItem({ file, onPreview, onDelete, readOnly }: FileItemProps) {
  const { t } = useTranslation();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hovered, setHovered] = useState(false);
  const showPreview = canPreview(file.mimeType);

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const a = document.createElement("a");
    a.href = `/api/files/${file.id}?download=true`;
    a.download = file.name;
    a.click();
  };

  return (
    <>
      <div
        onClick={() => {
          if (showPreview) onPreview(file);
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: hovered ? "var(--bg-elevated)" : "var(--bg-tertiary)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          padding: 16,
          cursor: showPreview ? "pointer" : "default",
          transition: "background 0.15s, border-color 0.15s",
          borderColor: hovered ? "var(--border-default)" : "var(--border-subtle)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <File size={32} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontWeight: 500,
                color: "var(--text-primary)",
                margin: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontSize: "0.875rem",
              }}
            >
              {file.name}
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", margin: "4px 0 0" }}>
              {formatSize(file.size)}
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", margin: "2px 0 0" }}>
              {new Date(file.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <InlineButton
            variant="ghost"
            size="xs"
            onClick={handleDownload}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              color: "var(--text-secondary)",
            }}
          >
            <Download size={12} /> {t("fileItem.download")}
          </InlineButton>
          {!readOnly && (
            <InlineButton
              variant="ghost"
              size="xs"
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(true);
              }}
              style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--accent-red)" }}
            >
              <Trash2 size={12} /> {t("fileItem.delete")}
            </InlineButton>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={showDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          setShowDeleteConfirm(false);
          onDelete(file.id);
        }}
        title={t("fileItem.deleteTitle")}
        message={t("fileItem.deleteMessage", { name: file.name })}
        confirmLabel={t("fileItem.delete")}
        variant="danger"
      />
    </>
  );
}
