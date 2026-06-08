"use client";

import { useEffect, useState } from "react";
import { ButtonGroup, type ButtonGroupItem } from "@/components/ui/button-group";
import { Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { TextInput } from "@/components/ui/text-input";
import { Typography } from "@/components/ui/typography";
import { useTranslation } from "@/hooks/useTranslation";
import { groupsApi } from "@/lib/api-client";
import type { Group } from "@/types/group";

interface EditGroupModalProps {
  group: Group | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditGroupModal({ group, onClose, onSuccess }: EditGroupModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

   
  useEffect(() => {
    if (group) setName(group.name);
  }, [group]);

  const handleSubmit = async () => {
    if (!group || !name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await groupsApi.update(group.id, { name: name.trim() });
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("groups.updateFailed"));
    } finally {
      setSaving(false);
    }
  };

  const actions: ButtonGroupItem[] = [
    {
      id: "cancel",
      label: t("groups.cancel"),
      onClick: onClose,
    },
    {
      id: "rename",
      label: t("groups.rename"),
      tone: "primary",
      onClick: handleSubmit,
      loading: saving,
      disabled: !name.trim() || name.trim() === group?.name,
    },
  ];

  return (
    <Modal open={!!group} onClose={onClose} maxWidth={400}>
      {group && (
        <div style={{ padding: 24 }}>
          <Typography as="h2" variant="titleMd" style={{ margin: "0 0 20px 0" }}>
            {t("groups.renameTitle")}
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
      )}
    </Modal>
  );
}
