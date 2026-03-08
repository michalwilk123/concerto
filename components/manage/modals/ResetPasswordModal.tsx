"use client";

import { useState } from "react";
import { InlineButton } from "@/components/ui/inline-button";
import { Modal } from "@/components/ui/modal";
import { TextInput } from "@/components/ui/text-input";
import { Typography } from "@/components/ui/typography";
import { useTranslation } from "@/hooks/useTranslation";
import { type AdminUser, adminApi } from "@/lib/api-client";

interface ResetPasswordModalProps {
  user: AdminUser | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ResetPasswordModal({ user, onClose, onSuccess }: ResetPasswordModalProps) {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setPassword("");
    setConfirm("");
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (password.length < 6) {
      setError(t("manage.passwordTooShort"));
      return;
    }
    if (password !== confirm) {
      setError(t("manage.passwordsMismatch"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await adminApi.resetPassword(user.id, password);
      setPassword("");
      setConfirm("");
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("manage.resetPasswordFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={!!user} onClose={handleClose} maxWidth={400}>
      {user && (
        <div style={{ padding: 24 }}>
          <Typography as="h2" variant="titleMd" style={{ margin: "0 0 4px 0" }}>
            {t("manage.resetPasswordTitle")}
          </Typography>
          <Typography as="p" variant="bodySm" tone="tertiary" style={{ margin: "0 0 20px 0" }}>
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

          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>
            <div>
              <Typography as="span" variant="label" tone="secondary" style={{ display: "block", marginBottom: 6 }}>
                {t("manage.newPasswordLabel")}
              </Typography>
              <TextInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder={t("manage.newPasswordPlaceholder")}
                style={{ width: "100%", fontSize: "0.84rem" }}
              />
            </div>
            <div>
              <Typography as="span" variant="label" tone="secondary" style={{ display: "block", marginBottom: 6 }}>
                {t("manage.confirmPasswordLabel")}
              </Typography>
              <TextInput
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                type="password"
                placeholder={t("manage.confirmPasswordPlaceholder")}
                style={{ width: "100%", fontSize: "0.84rem" }}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
            </div>
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
              disabled={!password || !confirm}
            >
              {t("manage.resetPasswordButton")}
            </InlineButton>
          </div>
        </div>
      )}
    </Modal>
  );
}
