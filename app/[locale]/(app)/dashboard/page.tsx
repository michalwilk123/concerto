"use client";

import { useRouter } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { LoadingIndicator } from "@/components/ui/loading-state";
import { groupsApi } from "@/lib/api-client";
import { useSession } from "@/lib/auth-client";
import { buildDashboardUrl } from "@/lib/dashboard-url";
import { useTranslation } from "@/hooks/useTranslation";

export default function DashboardRedirectPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const { t } = useTranslation();
  const isUserActive = (session?.user as { isActive?: boolean } | undefined)?.isActive ?? true;
  const [noGroups, setNoGroups] = useState(false);

  useEffect(() => {
    if (isPending) return;
    if (!session) {
      router.push("/login");
      return;
    }
    if (!isUserActive) {
      router.push("/waiting-approval");
      return;
    }

    groupsApi
      .list()
      .then((groups) => {
        if (groups.length > 0) {
          router.replace(buildDashboardUrl(groups[0].id));
        } else {
          setNoGroups(true);
        }
      })
      .catch(() => {});
  }, [isPending, session, router, isUserActive]);

  if (noGroups) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, padding: 32 }}>
        <p style={{ color: "var(--text-secondary)", fontSize: "1rem" }}>
          {t("dashboard.noGroups")}
        </p>
      </div>
    );
  }

  return (
    <LoadingIndicator
      message={t("dashboard.loading")}
      minHeight="100%"
      containerStyle={{ flex: 1 }}
    />
  );
}
