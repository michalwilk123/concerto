"use client";

import { ChevronLeft, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogIconHeader,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
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
import type { LocaleEntry } from "@/lib/api-client";
import { defaultTranslations, getTranslationSections } from "@/lib/translations";
import {
  diffOverrides,
  isMeaningfulOverride,
  matchesSearch,
} from "@/lib/translation-utils";
import { logOutliers } from "@/lib/translation-debug";

interface TranslationEditorProps {
  locale: LocaleEntry;
  onSave: (updated: LocaleEntry) => void | Promise<void>;
  onBack: () => void;
  isSaving: boolean;
}

interface FlatKey {
  key: string;
  source: string;
  /** The prefix of the section this key belongs to. */
  sectionPrefix: string;
  /** Friendly section label. */
  sectionLabel: string;
}

export function TranslationEditor({
  locale,
  onSave,
  onBack,
  isSaving,
}: TranslationEditorProps) {
  const { t } = useTranslation();

  const sections = useMemo(() => getTranslationSections(), []);

  // Flat, section-ordered list of every translatable key.
  const flatKeys = useMemo<FlatKey[]>(() => {
    const out: FlatKey[] = [];
    for (const section of sections) {
      for (const key of section.keys) {
        out.push({
          key,
          source: defaultTranslations[key] ?? "",
          sectionPrefix: section.prefix,
          sectionLabel: section.label,
        });
      }
    }
    return out;
  }, [sections]);

  const [overrides, setOverrides] = useState<Record<string, string>>(
    () => ({ ...locale.overrides }),
  );
  // Snapshot of the last-persisted overrides, used for diffing.
  const [original, setOriginal] = useState<Record<string, string>>(
    () => ({ ...locale.overrides }),
  );

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [untranslatedOnly, setUntranslatedOnly] = useState(false);

  const [summaryOpen, setSummaryOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [isRenamingLanguage, setIsRenamingLanguage] = useState(false);
  const [languageLabel, setLanguageLabel] = useState(locale.label);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Note: this component is remounted (keyed on locale code by the parent) when
  // switching languages, so the lazy state initializers above handle resets.

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
  }, []);

  const isReadOnly = locale.isDefault;

  const handleChange = useCallback((key: string, value: string) => {
    setOverrides((prev) => {
      const next = { ...prev };
      if (value === "" || value === defaultTranslations[key]) {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
  }, []);

  // The visible, section-ordered keys after applying all three filters.
  const visibleKeys = useMemo(() => {
    return flatKeys.filter((entry) => {
      const value = overrides[entry.key] ?? "";
      if (!matchesSearch(entry.key, entry.source, value, debouncedSearch)) {
        return false;
      }
      if (sectionFilter !== "all" && entry.sectionPrefix !== sectionFilter) {
        return false;
      }
      if (untranslatedOnly && isMeaningfulOverride(entry.key, overrides[entry.key])) {
        return false;
      }
      return true;
    });
  }, [flatKeys, overrides, debouncedSearch, sectionFilter, untranslatedOnly]);

  const focusNextUntranslated = useCallback(
    (currentKey: string) => {
      const idx = visibleKeys.findIndex((e) => e.key === currentKey);
      if (idx === -1) return;
      for (let i = idx + 1; i < visibleKeys.length; i++) {
        const candidate = visibleKeys[i];
        if (!isMeaningfulOverride(candidate.key, overrides[candidate.key])) {
          document.getElementById(`tinput-${candidate.key}`)?.focus();
          return;
        }
      }
    },
    [visibleKeys, overrides],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, key: string) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        focusNextUntranslated(key);
      } else if (e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        focusNextUntranslated(key);
      }
    },
    [focusNextUntranslated],
  );

  const changes = useMemo(
    () => diffOverrides(original, overrides),
    [original, overrides],
  );
  const isDirty = changes.length > 0;
  const showSave = isDirty && !isReadOnly;

  // Warn on tab close while there are unsaved changes.
  useEffect(() => {
    if (!isDirty || isReadOnly) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty, isReadOnly]);

  const handleBack = useCallback(() => {
    if (isDirty && !isReadOnly) {
      setLeaveOpen(true);
    } else {
      onBack();
    }
  }, [isDirty, isReadOnly, onBack]);

  const handleConfirmSave = useCallback(async () => {
    await onSave({ ...locale, overrides });
    setOriginal({ ...overrides });
    setSummaryOpen(false);
  }, [onSave, locale, overrides]);

  const handleRenameLanguage = useCallback(async () => {
    const trimmed = languageLabel.trim();
    if (!trimmed) return;
    await onSave({ ...locale, label: trimmed, overrides });
    setIsRenamingLanguage(false);
  }, [languageLabel, locale, onSave, overrides]);

  // ── TEMP styling diagnosis (outliers only) ──────────────────────────────
  const rootRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const root = rootRef.current;
      const header = headerRef.current;
      const body = bodyRef.current;
      if (!root || !header || !body) return;
      const parent = root.parentElement;
      const row = body.querySelector<HTMLElement>("[data-debug-row]");
      const cols = row ? Array.from(row.children) as HTMLElement[] : [];
      const leftW = cols[0]?.getBoundingClientRect().width ?? 0;
      const rightW = cols[1]?.getBoundingClientRect().width ?? 0;
      const input = row?.querySelector<HTMLElement>("input");
      const source = cols[0]?.querySelector<HTMLElement>("[data-debug-source]");
      logOutliers("TranslationEditor", [
        // Root should fill its parent's height (flex:1 wrapper in page.tsx).
        { label: "root fills parent height", expected: parent?.clientHeight ?? 0, actual: root.clientHeight, tolerance: 2 },
        // Root must not exceed the parent (parent has overflow:hidden → would clip).
        { label: "root within parent (no clip)", expected: true, actual: parent ? root.scrollHeight <= parent.clientHeight + 2 : true, note: "true = body scroll absorbs overflow, not the root" },
        // The body is the intended scroll container.
        { label: "body is scroll container", expected: "auto", actual: getComputedStyle(body).overflowY },
        // Two-column grid should be symmetric (minmax(0,1fr) minmax(0,1fr)).
        { label: "two columns symmetric", expected: Math.round(leftW), actual: Math.round(rightW), tolerance: 2, note: "left vs right column px" },
        // Input should fill the right column.
        { label: "input fills right column", expected: Math.round(rightW), actual: input ? Math.round(input.getBoundingClientRect().width) : 0, tolerance: 4 },
        // English source text should not overflow its (multiline) cell.
        { label: "source text not h-overflowing", expected: true, actual: source ? source.scrollWidth <= source.clientWidth + 1 : true },
        // Header is pinned (shouldn't itself scroll).
        { label: "header not scrolling", expected: "hidden", actual: getComputedStyle(header).overflow },
      ]);
    });
    return () => cancelAnimationFrame(raf);
  }, [visibleKeys.length, locale.code]);
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div
      ref={rootRef}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {/* Pinned header */}
      <div
        ref={headerRef}
        style={{
          padding: "16px 24px",
          borderBottom: "1px solid var(--border-subtle)",
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            iconStart={<ChevronLeft size={16} />}
            style={{ flexShrink: 0 }}
          >
            {t("translations.back")}
          </Button>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
          }}
        >
          {isRenamingLanguage ? (
            <>
              <TextInput
                autoFocus
                value={languageLabel}
                onChange={(e) => setLanguageLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleRenameLanguage();
                  if (e.key === "Escape") {
                    setLanguageLabel(locale.label);
                    setIsRenamingLanguage(false);
                  }
                }}
                style={{ width: "min(360px, 100%)", fontSize: "0.9rem" }}
              />
              <Button
                variant="primary"
                size="sm"
                disabled={!languageLabel.trim() || languageLabel.trim() === locale.label}
                onClick={() => void handleRenameLanguage()}
                style={{ flexShrink: 0 }}
              >
                {t("manage.saveChanges")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setLanguageLabel(locale.label);
                  setIsRenamingLanguage(false);
                }}
                style={{ flexShrink: 0 }}
              >
                {t("confirmDialog.cancel")}
              </Button>
            </>
          ) : (
            <>
              <Typography as="h2" variant="titleMd" style={{ minWidth: 0 }}>
                {t("translations.editingTitle", { label: locale.label })}
              </Typography>
              {!isReadOnly && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setLanguageLabel(locale.label);
                    setIsRenamingLanguage(true);
                  }}
                  style={{ flexShrink: 0 }}
                >
                  {t("translations.rename")}
                </Button>
              )}
            </>
          )}
        </div>

        {isReadOnly && (
          <div
            style={{
              background: "var(--bg-elevated)",
              color: "var(--text-secondary)",
              fontSize: "0.78rem",
              padding: "8px 12px",
              borderRadius: "var(--radius-sm)",
              marginBottom: 12,
            }}
          >
            {t("translations.readOnlyBanner")}
          </div>
        )}

        {/* Search */}
        <div style={{ position: "relative", marginBottom: 10 }}>
          <Search
            size={15}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-tertiary)",
              pointerEvents: "none",
            }}
          />
          <TextInput
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t("translations.searchPlaceholder")}
            type="search"
            autoComplete="off"
            style={{ width: "100%", paddingLeft: 36, fontSize: "0.84rem" }}
          />
        </div>

        {/* Filter row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: "0 1 240px", minWidth: 160 }}>
            <Select value={sectionFilter} onValueChange={setSectionFilter}>
              <SelectTrigger variant="compact" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("translations.sectionAll")}</SelectItem>
                {sections.map((section) => (
                  <SelectItem key={section.prefix} value={section.prefix}>
                    {section.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: "0.8rem",
              color: "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={untranslatedOnly}
              onChange={(e) => setUntranslatedOnly(e.target.checked)}
            />
            {t("translations.untranslatedOnly")}
          </label>
        </div>
      </div>

      {/* Scrollable body */}
      <div ref={bodyRef} style={{ flex: 1, overflow: "auto", padding: "12px 24px 80px" }}>
        {visibleKeys.length === 0 ? (
          <div
            style={{
              padding: "48px 20px",
              textAlign: "center",
              color: "var(--text-tertiary)",
              fontSize: "0.85rem",
            }}
          >
            {t("translations.noMatches")}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10, maxWidth: 980 }}>
            {visibleKeys.map((entry) => (
              <div
                key={entry.key}
                data-debug-row=""
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
                  gap: 16,
                  alignItems: "start",
                  paddingBottom: 10,
                  borderBottom: "1px solid var(--border-subtle)",
                }}
              >
                <div style={{ minWidth: 0 }} title={entry.key}>
                  <div
                    style={{
                      fontSize: "0.7rem",
                      color: "var(--text-tertiary)",
                      marginBottom: 3,
                    }}
                  >
                    {entry.sectionLabel}
                  </div>
                  <div
                    data-debug-source=""
                    style={{
                      fontSize: "0.84rem",
                      color: "var(--text-primary)",
                      lineHeight: 1.4,
                    }}
                  >
                    {entry.source}
                  </div>
                </div>
                <div style={{ minWidth: 0 }}>
                  <TextInput
                    id={`tinput-${entry.key}`}
                    value={overrides[entry.key] ?? ""}
                    onChange={(e) => handleChange(entry.key, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, entry.key)}
                    placeholder={entry.source}
                    disabled={isReadOnly}
                    style={{
                      width: "100%",
                      padding: "7px 10px",
                      fontSize: "0.8125rem",
                      borderRadius: "var(--radius-sm)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Save — fixed to the viewport so it stays visible while
          scrolling the (often very long) translation list. */}
      {showSave && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 50,
          }}
        >
          <Button
            variant="primary"
            onClick={() => setSummaryOpen(true)}
            disabled={isSaving}
            loading={isSaving}
            style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.25)" }}
          >
            {t("translations.saveCount", { count: String(changes.length) })}
          </Button>
        </div>
      )}

      {/* Save summary dialog */}
      <AlertDialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <AlertDialogContent className="max-w-[520px]">
          <div style={{ padding: "20px 24px 0" }}>
            <Typography as="h3" variant="titleMd">
              {t("translations.summaryTitle", {
                count: String(changes.length),
                label: locale.label,
              })}
            </Typography>
          </div>
          <div
            style={{
              maxHeight: 320,
              overflow: "auto",
              padding: "12px 24px",
              display: "grid",
              gap: 8,
            }}
          >
            {changes.map((change) => (
              <div
                key={change.key}
                style={{
                  fontSize: "0.8125rem",
                  fontFamily: "var(--font-mono, monospace)",
                  display: "flex",
                  alignItems: "baseline",
                  gap: 6,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ color: "var(--text-secondary)" }}>
                  {change.source}
                </span>
                <span style={{ color: "var(--text-tertiary)" }}>→</span>
                {change.cleared ? (
                  <span
                    style={{
                      color: "var(--text-tertiary)",
                      fontStyle: "italic",
                    }}
                  >
                    {t("translations.summaryCleared")}
                  </span>
                ) : (
                  <span style={{ color: "var(--text-primary)" }}>
                    {change.value}
                  </span>
                )}
              </div>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("translations.edit")}</AlertDialogCancel>
            <AlertDialogAction
              variant="warning"
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmSave();
              }}
            >
              {t("translations.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unsaved-changes leave guard */}
      <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <AlertDialogContent>
          <AlertDialogIconHeader
            variant="warning"
            title={t("translations.unsavedTitle")}
            description={t("translations.unsavedMessage", {
              count: String(changes.length),
            })}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>{t("translations.keepEditing")}</AlertDialogCancel>
            <AlertDialogAction
              variant="danger"
              onClick={() => {
                setLeaveOpen(false);
                onBack();
              }}
            >
              {t("translations.leave")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
