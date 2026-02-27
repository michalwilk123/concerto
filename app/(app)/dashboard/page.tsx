"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoadingIndicator } from "@/components/ui/loading-state";
import { groupsApi } from "@/lib/api-client";
import { useSession } from "@/lib/auth-client";
import { buildDashboardUrl } from "@/lib/dashboard-url";
import { useTranslation } from "@/hooks/useTranslation";

export default function DashboardRedirectPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const { t } = useTranslation();

  useEffect(() => {
    if (isPending) return;
    if (!session) {
      router.push("/login");
      return;
    }

    groupsApi
      .list()
      .then((groups) => {
        if (groups.length > 0) {
          router.replace(buildDashboardUrl(groups[0].id));
        }
      })
      .catch(() => {});
  }, [isPending, session, router]);

  return (
    <LoadingIndicator
      message={t("dashboard.loading")}
      minHeight="100%"
      containerStyle={{ flex: 1 }}
    />
  );
}
