"use client";

import { useState } from "react";
import { ButtonGroup, type ButtonGroupItem } from "@/components/ui/button-group";
import { Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { TextInput } from "@/components/ui/text-input";
import { Typography } from "@/components/ui/typography";
import { useTranslation } from "@/hooks/useTranslation";
import type { LocaleEntry } from "@/lib/api-client";

const CODE_RE = /^[a-z]{2,10}$/;

interface EditLanguageModalProps {
  open: boolean;
  locale: LocaleEntry | null;
  existingCodes: string[];
  onClose: () => void;
  onSave: (updated: LocaleEntry) => void;
}

export function EditLanguageModal({
  open,
  locale,
  existingCodes,
  onClose,
  onSave,
}: EditLanguageModalProps) {
  const { t } = useTranslation();
  // Seeded from the locale prop; the parent remounts this modal per target
  // (keyed on code), so lazy initializers handle resets — no effect needed.
  const [code, setCode] = useState(() => locale?.code ?? "");
  const [label, setLabel] = useState(() => locale?.label ?? "");
  const [rtl, setRtl] = useState(() => locale?.rtl ?? false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!locale) return;
    const normalized = code.trim().toLowerCase();
    if (!CODE_RE.test(normalized)) {
      setError(t("translations.codeInvalid"));
      return;
    }
    if (existingCodes.includes(normalized)) {
      setError(t("translations.codeDuplicate"));
      return;
    }
    if (!label.trim()) return;
    onSave({
      ...locale,
      code: normalized,
      label: label.trim(),
      rtl,
    });
  };

  const actions: ButtonGroupItem[] = [
    {
      id: "cancel",
      label: t("confirmDialog.cancel"),
      onClick: onClose,
    },
    {
      id: "save",
      label: t("manage.saveChanges"),
      tone: "primary",
      onClick: handleSubmit,
      disabled: !code.trim() || !label.trim(),
    },
  ];

  return (
    <Modal open={open} onClose={onClose} maxWidth={400}>
      <div style={{ padding: 24 }}>
        <Typography as="h2" variant="titleMd" style={{ margin: "0 0 20px 0" }}>
          {t("translations.renameTitle")}
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

        <Field label={t("translations.codeLabel")} required style={{ marginBottom: 16 }}>
          <TextInput
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t("translations.codePlaceholder")}
            style={{ width: "100%", fontSize: "0.84rem", fontFamily: "monospace" }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
        </Field>

        <Field label={t("translations.labelLabel")} required style={{ marginBottom: 16 }}>
          <TextInput
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t("translations.labelPlaceholder")}
            style={{ width: "100%", fontSize: "0.84rem" }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
        </Field>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: "0.84rem",
            color: "var(--text-secondary)",
            cursor: "pointer",
            marginBottom: 20,
          }}
        >
          <input type="checkbox" checked={rtl} onChange={(e) => setRtl(e.target.checked)} />
          {t("translations.rtlLabel")}
        </label>

        <ButtonGroup variant="toolbar" size="sm" items={actions} className="justify-end" />
      </div>
    </Modal>
  );
}
