"use client";

import { Folder, Trash2 } from "lucide-react";
import { useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/ui/section-heading";
import { useTranslation } from "@/hooks/useTranslation";
import type { FolderDoc } from "@/types/files";

interface FolderListProps {
  folders: FolderDoc[];
  onNavigate: (id: string) => void;
  onDelete: (id: string) => void;
  readOnly?: boolean;
}

export function FolderList({ folders, onNavigate, onDelete, readOnly }: FolderListProps) {
  const { t } = useTranslation();
  const [deleteFolder, setDeleteFolder] = useState<FolderDoc | null>(null);

  if (folders.length === 0) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <SectionHeading uppercase={false} style={{ fontSize: "0.84rem", marginBottom: 12 }}>
        {t("folders.title")}
      </SectionHeading>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        {folders.map((folder) => (
          <FolderCard
            key={folder.id}
            folder={folder}
            onNavigate={onNavigate}
            onDeleteClick={() => setDeleteFolder(folder)}
            readOnly={readOnly}
          />
        ))}
      </div>
      <ConfirmDialog
        open={!!deleteFolder}
        onCancel={() => setDeleteFolder(null)}
        onConfirm={() => {
          if (deleteFolder) {
            onDelete(deleteFolder.id);
            setDeleteFolder(null);
          }
        }}
        title={t("folders.deleteTitle")}
        message={t("folders.deleteMessage", { name: deleteFolder?.name ?? "" })}
        confirmLabel={t("folders.delete")}
        variant="danger"
      />
    </div>
  );
}

function FolderCard({
  folder,
  onNavigate,
  onDeleteClick,
  readOnly,
}: {
  folder: FolderDoc;
  onNavigate: (id: string) => void;
  onDeleteClick: () => void;
  readOnly?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const { t } = useTranslation();

  return (
    <div
      onClick={() => onNavigate(folder.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        cursor: "pointer",
        borderRadius: "var(--radius-lg)",
        border: `1px solid ${hovered ? "var(--border-default)" : "var(--border-subtle)"}`,
        background: hovered ? "var(--bg-elevated)" : "var(--bg-tertiary)",
        padding: 16,
        transition: "background 0.15s, border-color 0.15s",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Folder size={32} style={{ color: "var(--accent-purple)" }} />
          <div>
            <p
              style={{
                fontWeight: 500,
                color: "var(--text-primary)",
                margin: 0,
                fontSize: "0.875rem",
              }}
            >
              {folder.name}
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", margin: "4px 0 0" }}>
              {new Date(folder.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        {!readOnly && !folder.isSystem && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteClick();
            }}
            style={{
              opacity: hovered ? 1 : 0,
              background: "none",
              border: "none",
              padding: 4,
              cursor: "pointer",
              color: "var(--text-tertiary)",
              transition: "opacity 0.15s, color 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.color = "var(--accent-red)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.color = "var(--text-tertiary)";
            }}
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
      {folder.isSystem && (
        <Badge
          label={t("folders.systemBadge")}
          color="var(--bg-elevated)"
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            fontSize: "0.625rem",
            color: "var(--text-tertiary)",
            padding: "2px 6px",
          }}
        />
      )}
    </div>
  );
}
