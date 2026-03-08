"use client";

import { useState } from "react";
import { InlineButton } from "@/components/ui/inline-button";
import { Modal } from "@/components/ui/modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("");
    setRole("student");
    setIsActive(true);
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
      await adminApi.createUser({ name: name.trim(), email: email.trim(), password, role, isActive });
      resetForm();
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("manage.createUserFailed"));
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = name.trim() && email.trim() && password.length >= 6;

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
          <div>
            <Typography as="span" variant="label" tone="secondary" style={{ display: "block", marginBottom: 6 }}>
              {t("manage.nameLabel")}
            </Typography>
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("manage.namePlaceholder")}
              style={{ width: "100%", fontSize: "0.84rem" }}
            />
          </div>
          <div>
            <Typography as="span" variant="label" tone="secondary" style={{ display: "block", marginBottom: 6 }}>
              {t("manage.emailLabel")}
            </Typography>
            <TextInput
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("manage.emailPlaceholder")}
              type="email"
              style={{ width: "100%", fontSize: "0.84rem" }}
            />
          </div>
          <div>
            <Typography as="span" variant="label" tone="secondary" style={{ display: "block", marginBottom: 6 }}>
              {t("manage.passwordLabel")}
            </Typography>
            <TextInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("manage.passwordPlaceholder")}
              type="password"
              style={{ width: "100%", fontSize: "0.84rem" }}
            />
          </div>
          <div>
            <Typography as="span" variant="label" tone="secondary" style={{ display: "block", marginBottom: 6 }}>
              {t("manage.roleLabel")}
            </Typography>
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
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              style={{ accentColor: "var(--accent-primary)" }}
            />
            <Typography as="span" variant="bodySm">
              {t("manage.activeLabel")}
            </Typography>
          </label>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <InlineButton variant="secondary" size="sm" onClick={handleClose}>
            {t("manage.cancel")}
          </InlineButton>
          <InlineButton
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            loading={saving}
            disabled={!canSubmit}
          >
            {t("manage.createUserButton")}
          </InlineButton>
        </div>
      </div>
    </Modal>
  );
}
