"use client";

import { useState } from "react";
import { InlineButton } from "@/components/ui/inline-button";
import { Modal } from "@/components/ui/modal";
import { TextInput } from "@/components/ui/text-input";
import { Typography } from "@/components/ui/typography";
import { useTranslation } from "@/hooks/useTranslation";
import { groupsApi } from "@/lib/api-client";

interface CreateGroupModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateGroupModal({ open, onClose, onSuccess }: CreateGroupModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setName("");
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await groupsApi.create({ name: name.trim() });
      setName("");
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("groups.createFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} maxWidth={400}>
      <div style={{ padding: 24 }}>
        <Typography as="h2" variant="titleMd" style={{ margin: "0 0 20px 0" }}>
          {t("groups.createTitle")}
        </Typography>

        {error && (
          <Typography
            as="p"
            variant="meta"
            style={{ color: "var(--status-error)", margin: "0 0 16px 0" }}
          >
            {error}
          </Typography>
        )}

        <Typography as="span" variant="label" tone="secondary" style={{ display: "block", marginBottom: 6 }}>
          {t("groups.groupNameLabel")}
        </Typography>
        <TextInput
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("groups.groupNamePlaceholder")}
          style={{ width: "100%", marginBottom: 20, fontSize: "0.84rem" }}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <InlineButton variant="secondary" size="sm" onClick={handleClose}>
            {t("groups.cancel")}
          </InlineButton>
          <InlineButton
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            loading={saving}
            disabled={!name.trim()}
          >
            {t("groups.create")}
          </InlineButton>
        </div>
      </div>
    </Modal>
  );
}
