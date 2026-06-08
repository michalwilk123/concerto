"use client";

import { Trash2, X } from "lucide-react";
import { useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { ButtonGroup } from "@/components/ui/button-group";
import { useTranslation } from "@/hooks/useTranslation";

interface BulkActionBarProps {
  count: number;
  onClear: () => void;
  onDelete: () => void;
}

export function BulkActionBar({ count, onClear, onDelete }: BulkActionBarProps) {
  const { t } = useTranslation();
  const [showConfirm, setShowConfirm] = useState(false);

  if (count === 0) return null;

  return (
    <>
      <div
        style={{
          position: "fixed",
          bottom: 24,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "var(--bg-primary)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg)",
          padding: "10px 16px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
          zIndex: 100,
          fontSize: "0.875rem",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
          {t("fileList.selectedCount", { count: String(count) })}
        </span>

        <div style={{ width: 1, height: 20, background: "var(--border-subtle)" }} />

        <ButtonGroup
          variant="toolbar"
          size="sm"
          collapse="never"
          aria-label={t("fileList.deleteSelected")}
          items={[
            {
              id: "delete-selected",
              label: t("fileList.deleteSelected"),
              icon: <Trash2 size={14} />,
              quiet: true,
              tone: "danger",
              onClick: () => setShowConfirm(true),
            },
            {
              id: "clear",
              label: t("fileList.clearSelection"),
              ariaLabel: t("fileList.clearSelection"),
              icon: <X size={16} />,
              quiet: true,
              onClick: onClear,
            },
          ]}
        />
      </div>

      <ConfirmDialog
        open={showConfirm}
        onCancel={() => setShowConfirm(false)}
        onConfirm={() => {
          setShowConfirm(false);
          onDelete();
        }}
        title={t("fileItem.deleteTitle")}
        message={t("fileList.bulkDeleteConfirm", { count: String(count) })}
        confirmLabel={t("folders.delete")}
        variant="danger"
      />
    </>
  );
}
