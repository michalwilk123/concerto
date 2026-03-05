"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/components/Toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogIconHeader,
} from "@/components/ui/alert-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { IconButton } from "@/components/ui/icon-button";
import { InlineButton } from "@/components/ui/inline-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TextInput } from "@/components/ui/text-input";
import { Typography } from "@/components/ui/typography";
import { translationsApi } from "@/lib/api-client";
import type { TranslationSet } from "@/lib/api-client";
import { defaultTranslations, getTranslationSections } from "@/lib/translations";
import { invalidateTranslationCache, useTranslation } from "@/hooks/useTranslation";

export function TranslationsPanel() {
  const toast = useToast();
  const { t } = useTranslation();
  const [translations, setTranslations] = useState<TranslationSet[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const sections = getTranslationSections();

  useEffect(() => {
    translationsApi
      .getAll()
      .then((data) => {
        setTranslations(data.translations);
      })
      .catch(() => {
        setTranslations([{ name: "default", overrides: {} }]);
      });
  }, []);

  const active = translations[activeIndex];

  const handleChange = (key: string, value: string) => {
    setTranslations((prev) => {
      const updated = [...prev];
      const overrides = { ...updated[activeIndex].overrides };
      if (value === "" || value === defaultTranslations[key]) {
        delete overrides[key];
      } else {
        overrides[key] = value;
      }
      updated[activeIndex] = { ...updated[activeIndex], overrides };
      return updated;
    });
  };

  const handleNameChange = (name: string) => {
    setTranslations((prev) => {
      const updated = [...prev];
      updated[activeIndex] = { ...updated[activeIndex], name };
      return updated;
    });
  };

  const handleAddTranslation = () => {
    const newSet: TranslationSet = {
      name: t("translations.newTranslation"),
      overrides: active ? { ...active.overrides } : {},
    };
    const newIndex = translations.length;
    setTranslations((prev) => [...prev, newSet]);
    setActiveIndex(newIndex);
  };

  const handleDelete = () => {
    setTranslations((prev) => prev.filter((_, i) => i !== activeIndex));
    setActiveIndex(0);
    setDeleteDialogOpen(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await translationsApi.saveAll(translations);
      invalidateTranslationCache();
      toast.success(t("translations.saveSuccess"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("translations.saveFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  if (!active) return null;

  const values: Record<string, string> = { ...defaultTranslations, ...active.overrides };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Fixed top bar */}
      <div
        style={{
          padding: "16px 24px",
          borderBottom: "1px solid var(--border-subtle)",
          flexShrink: 0,
        }}
      >
        <Typography as="h2" variant="titleMd" style={{ marginBottom: 12 }}>
          {t("translations.title")}
        </Typography>

        {/* Translation selector row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Select
            value={String(activeIndex)}
            onValueChange={(v) => setActiveIndex(Number(v))}
          >
            <SelectTrigger variant="compact" className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {translations.map((ts, i) => (
                <SelectItem key={i} value={String(i)}>
                  {ts.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <IconButton
            variant="square"
            size="sm"
            onClick={handleAddTranslation}
            title={t("translations.addTranslation")}
          >
            <Plus size={14} />
          </IconButton>
        </div>

        {/* Editable name + delete */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
          <TextInput
            variant="inline"
            value={active.name}
            onChange={(e) => handleNameChange(e.target.value)}
            style={{
              flex: 1,
              fontSize: "0.9rem",
              fontWeight: 500,
              borderBottom: "1px solid var(--border-default)",
              borderRadius: 0,
              paddingBottom: 4,
            }}
          />
          <IconButton
            variant="square"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={translations.length <= 1}
            title={t("translations.deleteButton")}
            style={
              translations.length > 1 ? { color: "var(--accent-red)" } : undefined
            }
          >
            <Trash2 size={14} />
          </IconButton>
        </div>
      </div>

      {/* Scrollable form */}
      <div style={{ flex: 1, overflow: "auto", padding: "8px 20px" }}>
        <div style={{ maxWidth: 680 }}>
          <Accordion type="multiple">
            {sections.map((section) => (
              <AccordionItem key={section.prefix} value={section.prefix}>
                <AccordionTrigger>{section.label}</AccordionTrigger>
                <AccordionContent className="pl-5">
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
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>

      {/* Save button at bottom */}
      <div
        style={{
          padding: "12px 24px",
          borderTop: "1px solid var(--border-subtle)",
          flexShrink: 0,
        }}
      >
        <InlineButton
          variant="accent"
          size="sm"
          onClick={handleSave}
          disabled={isSaving}
          style={{ width: "100%" }}
        >
          {isSaving ? t("translations.saving") : t("translations.save")}
        </InlineButton>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogIconHeader
            variant="danger"
            title={t("translations.deleteTitle")}
            description={t("translations.deleteMessage", { name: active.name })}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>{t("confirmDialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="danger" onClick={handleDelete}>
              {t("translations.deleteButton")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
