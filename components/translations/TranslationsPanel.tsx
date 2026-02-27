"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";
import { InlineButton } from "@/components/ui/inline-button";
import { TextInput } from "@/components/ui/text-input";
import { Typography } from "@/components/ui/typography";
import { translationsApi } from "@/lib/api-client";
import { defaultTranslations, getTranslationSections } from "@/lib/translations";
import { invalidateTranslationCache } from "@/hooks/useTranslation";
import { useTranslation } from "@/hooks/useTranslation";

export function TranslationsPanel() {
  const toast = useToast();
  const { t } = useTranslation();
  const [values, setValues] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const sections = getTranslationSections();

  useEffect(() => {
    translationsApi
      .get()
      .then((overrides) => {
        setValues({ ...defaultTranslations, ...overrides });
      })
      .catch(() => {
        setValues({ ...defaultTranslations });
      });
  }, []);

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Only persist keys that differ from defaults
      const overrides: Record<string, string> = {};
      for (const [key, value] of Object.entries(values)) {
        if (value !== defaultTranslations[key]) {
          overrides[key] = value;
        }
      }
      await translationsApi.save(overrides);
      invalidateTranslationCache();
      toast.success(t("translations.saveSuccess"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("translations.saveFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Fixed top bar */}
      <div
        style={{
          padding: "16px 24px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <Typography as="h2" variant="titleMd">
          {t("translations.title")}
        </Typography>
        <InlineButton variant="accent" size="sm" onClick={handleSave} disabled={isSaving}>
          {isSaving ? t("translations.saving") : t("translations.save")}
        </InlineButton>
      </div>

      {/* Scrollable form */}
      <div style={{ flex: 1, overflow: "auto", padding: "16px 20px" }}>
        <div style={{ maxWidth: 680, display: "grid", gap: 20 }}>
          {sections.map((section) => (
            <div key={section.prefix}>
              <Typography
                as="h3"
                variant="titleSm"
                style={{ marginBottom: 8, color: "var(--text-secondary)" }}
              >
                {section.label}
              </Typography>
              <div style={{ display: "grid", gap: 8 }}>
                {section.keys.map((key) => (
                  <div key={key}>
                    <label
                      htmlFor={`tkey-${key}`}
                      style={{
                        display: "block",
                        fontSize: "0.75rem",
                        color: "var(--text-tertiary)",
                        marginBottom: 3,
                        fontFamily: "monospace",
                      }}
                    >
                      {key}
                    </label>
                    <TextInput
                      id={`tkey-${key}`}
                      value={values[key] ?? ""}
                      onChange={(e) => handleChange(key, e.target.value)}
                      placeholder={defaultTranslations[key]}
                      style={{
                        width: "100%",
                        padding: "7px 10px",
                        fontSize: "0.8125rem",
                        borderRadius: "var(--radius-sm)",
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
