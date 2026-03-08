"use client";

import { useEffect, useState } from "react";
import { InlineButton } from "@/components/ui/inline-button";
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

  // eslint-disable-next-line react-you-might-not-need-an-effect/no-adjust-state-on-prop-change
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
            <InlineButton variant="secondary" size="sm" onClick={onClose}>
              {t("groups.cancel")}
            </InlineButton>
            <InlineButton
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              loading={saving}
              disabled={!name.trim() || name.trim() === group.name}
            >
              {t("groups.rename")}
            </InlineButton>
          </div>
        </div>
      )}
    </Modal>
  );
}
