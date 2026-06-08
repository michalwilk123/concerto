"use client";

import { Languages } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ButtonGroup } from "@/components/ui/button-group";
import { DataTableShell } from "@/components/ui/data-table-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { EntityGridRow } from "@/components/ui/entity-list-row";
import { Typography } from "@/components/ui/typography";
import { useTranslation } from "@/hooks/useTranslation";
import type { LocaleEntry } from "@/lib/api-client";
import { computeTranslationStats } from "@/lib/translation-utils";
import { AddLanguageModal } from "./AddLanguageModal";

const COLUMNS = "510px 90px 120px 140px";
const MIN_TABLE_WIDTH = 900;
const TABLE_MAX_WIDTH = 960;

interface TranslationLanguageListProps {
  locales: LocaleEntry[];
  onEdit: (code: string) => void;
  onSaveAll: (updated: LocaleEntry[]) => void | Promise<void>;
}

export function TranslationLanguageList({
  locales,
  onEdit,
  onSaveAll,
}: TranslationLanguageListProps) {
  const { t } = useTranslation();
  const [addOpen, setAddOpen] = useState(false);

  const existingCodes = locales.map((l) => l.code);

  const handleAdd = (entry: LocaleEntry) => {
    void onSaveAll([...locales, entry]);
    setAddOpen(false);
    onEdit(entry.code);
  };

  const headerLabels = [
    t("translations.colLanguage"),
    t("translations.colCode"),
    t("translations.colProgress"),
    t("translations.colStatus"),
  ];

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: 16 }}>
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          margin: "0 auto 20px",
          maxWidth: TABLE_MAX_WIDTH,
        }}
      >
        <Typography as="h2" variant="titleMd" style={{ margin: 0 }}>
          {t("translations.languagesTitle")}
        </Typography>
        <div style={{ marginLeft: "auto", flex: "0 0 auto" }}>
          <ButtonGroup
            variant="toolbar"
            size="sm"
            aria-label={t("translations.addLanguage")}
            items={[
              {
                id: "add-language",
                label: t("translations.addLanguage"),
                tone: "primary",
                onClick: () => setAddOpen(true),
              },
            ]}
          />
        </div>
      </div>

      <DataTableShell
        name="translation-languages"
        headers={headerLabels}
        headerLabels={headerLabels}
        columns={COLUMNS}
        minTableWidth={MIN_TABLE_WIDTH}
        containerStyle={{ maxWidth: TABLE_MAX_WIDTH, margin: "0 auto" }}
        isLoading={false}
        hasRows={locales.length > 0}
        emptyState={
          <EmptyState
            icon={<Languages size={32} />}
            title={t("translations.emptyTitle")}
            padding="48px 20px"
          />
        }
      >
        {locales.map((locale, i) => {
          const stats = computeTranslationStats(locale);
          const goEdit = () => onEdit(locale.code);
          const cellClick = { onClick: goEdit, style: { cursor: "pointer" as const } };
          return (
            <EntityGridRow key={locale.code} columns={COLUMNS} isLast={i === locales.length - 1}>
              <div
                {...cellClick}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  minWidth: 0,
                  cursor: "pointer",
                }}
              >
                <span
                  title={locale.label}
                  style={{
                    fontSize: "0.84rem",
                    fontWeight: 500,
                    color: "var(--text-primary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {locale.label}
                </span>
                {locale.isDefault && (
                  <Badge
                    label={t("translations.defaultSourceBadge")}
                    color="var(--accent-blue, #3b82f6)"
                  />
                )}
              </div>

              <span
                {...cellClick}
                style={{
                  fontSize: "0.8rem",
                  fontFamily: "monospace",
                  color: "var(--text-tertiary)",
                  cursor: "pointer",
                }}
              >
                {locale.code}
              </span>

              <div {...cellClick} style={{ cursor: "pointer" }}>
                <span
                  style={{
                    fontSize: "0.8rem",
                    fontVariantNumeric: "tabular-nums",
                    color: "var(--text-secondary)",
                  }}
                >
                  {stats.translated}/{stats.total}
                </span>
              </div>

              <div
                {...cellClick}
                style={{ cursor: "pointer" }}
              >
                <span
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  {locale.enabled ? "Yes" : "No"}
                </span>
              </div>
            </EntityGridRow>
          );
        })}
      </DataTableShell>

      <AddLanguageModal
        open={addOpen}
        existingCodes={existingCodes}
        onClose={() => setAddOpen(false)}
        onCreate={handleAdd}
      />
    </div>
  );
}
