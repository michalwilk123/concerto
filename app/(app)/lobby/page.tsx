"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { useToast } from "@/components/Toast";
import { useTranslation } from "@/hooks/useTranslation";

export default function LobbyPage() {
  return (
    <Suspense>
      <LobbyContent />
    </Suspense>
  );
}

function LobbyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { t } = useTranslation();
  const joinKey = searchParams.get("key")?.toUpperCase() || "";
  const kicked = searchParams.get("kicked") === "true";

  useEffect(() => {
    if (joinKey) {
      router.replace(`/meet?key=${joinKey}`);
    }
  }, [joinKey, router]);

  useEffect(() => {
    if (kicked) {
      toast.warning(t("lobby.kickedWarning"));
      router.replace("/lobby");
    }
  }, [kicked, router, t, toast]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        flex: 1,
        gap: "var(--space-2xl)",
        background: "var(--bg-primary)",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <p
          style={{
            color: "var(--text-secondary)",
            fontSize: "1rem",
            margin: 0,
            maxWidth: 360,
          }}
        >
          {t("lobby.waitingMessage")}
        </p>
      </div>
    </div>
  );
}
