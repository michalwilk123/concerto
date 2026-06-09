"use client";

import { useState } from "react";
import { ButtonGroup, type ButtonGroupItem } from "@/components/ui/button-group";
import { Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Typography } from "@/components/ui/typography";
import { useTranslation } from "@/hooks/useTranslation";
import { type AdminUser, adminApi } from "@/lib/api-client";

interface EditUserModalProps {
  user: AdminUser | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditUserModal({ user, onClose, onSuccess }: EditUserModalProps) {
  const { t } = useTranslation();
  const [role, setRole] = useState(user?.role || "student");
  const [banned, setBanned] = useState(user?.banned ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await adminApi.updateUser(user.id, { role, banned });
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("manage.updateUserFailed"));
    } finally {
      setSaving(false);
    }
  };

  const actions: ButtonGroupItem[] = [
    {
      id: "cancel",
      label: t("manage.cancel"),
      onClick: onClose,
    },
    {
      id: "save",
      label: t("manage.saveChanges"),
      tone: "primary",
      onClick: handleSave,
      loading: saving,
    },
  ];

  return (
    <Modal open={!!user} onClose={onClose} maxWidth={420}>
      {user && (
        <div style={{ padding: 24 }}>
          <Typography as="h2" variant="titleMd" style={{ margin: "0 0 4px 0" }}>
            {t("manage.editUserTitle")}
          </Typography>
          <Typography as="p" variant="bodySm" tone="tertiary" style={{ margin: "0 0 24px 0" }}>
            {user.name} &middot; {user.email}
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

          <Field label={t("manage.roleLabel")} style={{ marginBottom: 20 }}>
            <Select value={role || "student"} onValueChange={setRole}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">{t("manage.roleAdmin")}</SelectItem>
                <SelectItem value="teacher">{t("manage.roleTeacher")}</SelectItem>
                <SelectItem value="student">{t("manage.roleStudent")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={banned}
                onChange={(e) => setBanned(e.target.checked)}
                style={{ accentColor: "var(--status-error)" }}
              />
              <Typography as="span" variant="bodySm">
                {t("manage.bannedLabel")}
              </Typography>
            </label>
          </div>

          <ButtonGroup variant="toolbar" size="sm" items={actions} className="justify-end" />
        </div>
      )}
    </Modal>
  );
}
