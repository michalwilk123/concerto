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
import { TextInput } from "@/components/ui/text-input";
import { Typography } from "@/components/ui/typography";
import { useTranslation } from "@/hooks/useTranslation";
import { adminApi } from "@/lib/api-client";

interface CreateUserModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateUserModal({ open, onClose, onSuccess }: CreateUserModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("");
    setRole("student");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !password) return;
    setSaving(true);
    setError(null);
    try {
      await adminApi.createUser({ name: name.trim(), email: email.trim(), password, role });
      resetForm();
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("manage.createUserFailed"));
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = name.trim() && email.trim() && password.length >= 6;

  const actions: ButtonGroupItem[] = [
    {
      id: "cancel",
      label: t("manage.cancel"),
      onClick: handleClose,
    },
    {
      id: "create",
      label: t("manage.createUserButton"),
      tone: "primary",
      onClick: handleSubmit,
      loading: saving,
      disabled: !canSubmit,
    },
  ];

  return (
    <Modal open={open} onClose={handleClose} maxWidth={440}>
      <div style={{ padding: 24 }}>
        <Typography as="h2" variant="titleMd" style={{ margin: "0 0 20px 0" }}>
          {t("manage.createUserTitle")}
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

        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>
          <Field label={t("manage.nameLabel")} required>
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("manage.namePlaceholder")}
              style={{ width: "100%", fontSize: "0.84rem" }}
            />
          </Field>
          <Field label={t("manage.emailLabel")} required>
            <TextInput
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("manage.emailPlaceholder")}
              type="email"
              style={{ width: "100%", fontSize: "0.84rem" }}
            />
          </Field>
          <Field label={t("manage.passwordLabel")} required>
            <TextInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("manage.passwordPlaceholder")}
              type="password"
              style={{ width: "100%", fontSize: "0.84rem" }}
            />
          </Field>
          <Field label={t("manage.roleLabel")}>
            <Select value={role} onValueChange={setRole}>
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
        </div>

        <ButtonGroup variant="toolbar" size="sm" items={actions} className="justify-end" />
      </div>
    </Modal>
  );
}
