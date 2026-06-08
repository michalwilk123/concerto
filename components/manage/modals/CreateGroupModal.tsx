"use client";

import { useState } from "react";
import { ButtonGroup, type ButtonGroupItem } from "@/components/ui/button-group";
import { Field } from "@/components/ui/field";
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

  const actions: ButtonGroupItem[] = [
    {
      id: "cancel",
      label: t("groups.cancel"),
      onClick: handleClose,
    },
    {
      id: "create",
      label: t("groups.create"),
      tone: "primary",
      onClick: handleSubmit,
      loading: saving,
      disabled: !name.trim(),
    },
  ];

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

        <Field label={t("groups.groupNameLabel")} required style={{ marginBottom: 20 }}>
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("groups.groupNamePlaceholder")}
            style={{ width: "100%", fontSize: "0.84rem" }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
        </Field>

        <ButtonGroup variant="toolbar" size="sm" items={actions} className="justify-end" />
      </div>
    </Modal>
  );
}
