"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/Toast";
import { LoadingIndicator } from "@/components/ui/loading-state";
import { useTranslation } from "@/hooks/useTranslation";
import { defaultLocale } from "@/i18n/config";
import { useRouter } from "@/i18n/navigation";
import type { LocaleEntry } from "@/lib/api-client";
import { translationsApi } from "@/lib/api-client";
import { buildDashboardUrl } from "@/lib/dashboard-url";
import { TranslationEditor } from "./TranslationEditor";
import { TranslationLanguageList } from "./TranslationLanguageList";

export function TranslationsPanel() {
  const toast = useToast();
  const router = useRouter();
  const params = useParams<{ groupId: string }>();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const groupId = params.groupId;
  const lang = searchParams.get("lang");

  const [locales, setLocales] = useState<LocaleEntry[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    translationsApi
      .getAll()
      .then((data) => setLocales(data.locales))
      .catch(() => {
        setLocales([
          {
            code: defaultLocale,
            label: "English",
            isDefault: true,
            enabled: true,
            rtl: false,
            overrides: {},
          },
        ]);
      });
  }, []);

  const goToEditor = useCallback(
    (code: string) => {
      router.push(buildDashboardUrl(groupId, { tab: "translations", lang: code }));
    },
    [router, groupId],
  );

  const goToList = useCallback(() => {
    router.push(buildDashboardUrl(groupId, { tab: "translations" }));
  }, [router, groupId]);

  const handleSaveAll = useCallback(
    async (updated: LocaleEntry[]) => {
      setLocales(updated);
      setIsSaving(true);
      try {
        await translationsApi.saveAll(updated);
        await fetch("/api/translations/revalidate", { method: "POST" });
        router.refresh();
        toast.success(t("translations.saveSuccess"));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("translations.saveFailed"));
      } finally {
        setIsSaving(false);
      }
    },
    [router, toast, t],
  );

  const handleSaveLocale = useCallback(
    (updated: LocaleEntry) => handleSaveAll(locales!.map((l) => (l.code === updated.code ? updated : l))),
    [handleSaveAll, locales],
  );

  if (locales === null) {
    return <LoadingIndicator message={t("dashboard.loading")} minHeight="100%" containerStyle={{ flex: 1 }} />;
  }

  const active = lang ? locales.find((l) => l.code === lang) : undefined;

  if (lang && active) {
    return (
      <TranslationEditor
        key={active.code}
        locale={active}
        onSave={handleSaveLocale}
        onBack={goToList}
        isSaving={isSaving}
      />
    );
  }

  return (
    <TranslationLanguageList
      locales={locales}
      onEdit={goToEditor}
      onSaveAll={handleSaveAll}
    />
  );
}
