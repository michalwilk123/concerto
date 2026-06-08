"use client";

import { ButtonGroup, type ButtonGroupItem } from "@/components/ui/button-group";
import { Modal } from "@/components/ui/modal";
import { Typography } from "@/components/ui/typography";
import { useTranslation } from "@/hooks/useTranslation";

interface DeleteConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  warning?: string;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
}

export function DeleteConfirmModal({
  open,
  title,
  message,
  warning,
  onConfirm,
  onClose,
  loading,
}: DeleteConfirmModalProps) {
  const { t } = useTranslation();

  const actions: ButtonGroupItem[] = [
    {
      id: "cancel",
      label: t("manage.cancel"),
      onClick: onClose,
    },
    {
      id: "confirm",
      label: t("manage.confirm"),
      tone: "danger",
      onClick: onConfirm,
      loading,
    },
  ];

  return (
    <Modal open={open} onClose={onClose} maxWidth={400}>
      <div style={{ padding: 24 }}>
        <Typography as="h2" variant="titleMd" style={{ margin: "0 0 8px 0" }}>
          {title}
        </Typography>
        <Typography as="p" variant="bodySm" tone="secondary" style={{ margin: "0 0 8px 0" }}>
          {message}
        </Typography>
        {warning && (
          <Typography
            as="p"
            variant="meta"
            tone="tertiary"
            style={{
              margin: "0 0 24px 0",
              padding: "8px 12px",
              background: "rgba(239,68,68,0.06)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid rgba(239,68,68,0.12)",
            }}
          >
            {warning}
          </Typography>
        )}
        <ButtonGroup variant="toolbar" size="sm" items={actions} className="justify-end" />
      </div>
    </Modal>
  );
}
