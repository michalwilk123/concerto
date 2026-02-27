"use client";

import { AppHeader } from "@/components/AppHeader";
import { InlineButton } from "@/components/ui/inline-button";
import { useTranslation } from "@/hooks/useTranslation";

interface WaitingForApprovalPhaseProps {
  onBack: () => void;
}

export default function WaitingForApprovalPhase({ onBack }: WaitingForApprovalPhaseProps) {
  const { t } = useTranslation();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        background: "var(--bg-primary)",
      }}
    >
      <AppHeader mode="app" />
      <div
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            background: "var(--bg-secondary)",
            padding: "var(--space-2xl)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-subtle)",
            textAlign: "center",
            maxWidth: 420,
            width: "100%",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              border: "3px solid var(--accent-purple)",
              borderTopColor: "transparent",
              animation: "spin 1s linear infinite",
              margin: "0 auto var(--space-lg)",
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <h2 style={{ margin: "0 0 var(--space-sm)", color: "var(--text-primary)" }}>
            {t("room.waitingForApproval.title")}
          </h2>
          <p
            style={{
              color: "var(--text-secondary)",
              margin: "0 0 var(--space-xl)",
              fontSize: "0.9rem",
            }}
          >
            {t("room.waitingForApproval.message")}
          </p>
          <InlineButton
            variant="secondary"
            size="sm"
            onClick={onBack}
            style={{ padding: "var(--space-sm) var(--space-xl)" }}
          >
            {t("room.error.backToDashboard")}
          </InlineButton>
        </div>
      </div>
    </div>
  );
}
