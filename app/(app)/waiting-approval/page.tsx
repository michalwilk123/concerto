"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { InlineButton } from "@/components/ui/inline-button";
import { signOut, useSession } from "@/lib/auth-client";
import { useTranslation } from "@/hooks/useTranslation";

export default function WaitingApprovalPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { data: session, isPending } = useSession();
  const isUserActive = (session?.user as { isActive?: boolean } | undefined)?.isActive ?? true;

  useEffect(() => {
    if (isPending) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    if (isUserActive) {
      router.replace("/dashboard");
    }
  }, [isPending, session, router, isUserActive]);

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <div
      style={{
        display: "flex",
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-primary)",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-2xl)",
        }}
      >
        <h1 style={{ margin: "0 0 var(--space-md)", fontSize: "1.2rem", color: "var(--text-primary)" }}>
          {t("auth.waitingApproval.title")}
        </h1>
        <p style={{ margin: "0 0 var(--space-xl)", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
          {t("auth.waitingApproval.message")}
        </p>
        <InlineButton variant="secondary" size="sm" onClick={handleLogout}>
          {t("appHeader.logout")}
        </InlineButton>
      </div>
    </div>
  );
}
