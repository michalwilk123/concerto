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
import { SUPPORTED_LOCALES } from "@/i18n/config";
import type { LocaleEntry } from "@/lib/api-client";

const CODE_RE = /^[a-z]{2,10}$/;

interface AddLanguageModalProps {
  open: boolean;
  existingCodes: string[];
  onClose: () => void;
  onCreate: (entry: LocaleEntry) => void;
}

export function AddLanguageModal({ open, existingCodes, onClose, onCreate }: AddLanguageModalProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [rtl, setRtl] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const presets = SUPPORTED_LOCALES.filter((l) => !existingCodes.includes(l.code));

  const reset = () => {
    setCode("");
    setLabel("");
    setRtl(false);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handlePreset = (value: string) => {
    const preset = SUPPORTED_LOCALES.find((l) => l.code === value);
    if (preset) {
      setCode(preset.code);
      setLabel(preset.label);
      setError(null);
    }
  };

  const handleSubmit = () => {
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
    onCreate({
      code: normalized,
      label: label.trim(),
      isDefault: false,
      enabled: true,
      rtl,
      overrides: {},
    });
    reset();
  };

  const actions: ButtonGroupItem[] = [
    {
      id: "cancel",
      label: t("confirmDialog.cancel"),
      onClick: handleClose,
    },
    {
      id: "create",
      label: t("translations.create"),
      tone: "primary",
      onClick: handleSubmit,
      disabled: !code.trim() || !label.trim(),
    },
  ];

  return (
    <Modal open={open} onClose={handleClose} maxWidth={400}>
      <div style={{ padding: 24 }}>
        <Typography as="h2" variant="titleMd" style={{ margin: "0 0 20px 0" }}>
          {t("translations.addLanguageTitle")}
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

        {presets.length > 0 && (
          <Field label={t("translations.presetLabel")} style={{ marginBottom: 16 }}>
            <Select value="" onValueChange={handlePreset}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("translations.presetLabel")} />
              </SelectTrigger>
              <SelectContent>
                {presets.map((p) => (
                  <SelectItem key={p.code} value={p.code}>
                    {p.label} ({p.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
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
