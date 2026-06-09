"use client";

import { useEffect } from "react";
import { ManagePanel } from "@/components/manage/ManagePanel";
import { LoadingIndicator } from "@/components/ui/loading-state";
import { useTranslation } from "@/hooks/useTranslation";
import { useRouter } from "@/i18n/navigation";
import { useSession } from "@/lib/auth-client";

export default function DashboardManagePage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const { t } = useTranslation();

  const user = session?.user;
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (isPending) return;
    if (!session) {
      router.push("/login");
      return;
    }
    if (!isAdmin) {
      router.replace("/dashboard");
    }
  }, [isPending, session, isAdmin, router]);

  if (isPending) {
    return (
      <LoadingIndicator
        message={t("dashboard.loading")}
        minHeight="100%"
        containerStyle={{ flex: 1 }}
      />
    );
  }

  if (!session || !isAdmin) return null;

  return (
    <main style={{ flex: 1, overflow: "auto" }}>
      <ManagePanel />
    </main>
  );
}
