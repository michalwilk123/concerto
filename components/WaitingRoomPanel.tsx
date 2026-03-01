"use client";

import { useState } from "react";
import { InlineButton } from "@/components/ui/inline-button";
import { Typography } from "@/components/ui/typography";
import { useTranslation } from "@/hooks/useTranslation";
import { roomApi, type WaitingParticipant } from "@/lib/api-client";

interface WaitingRoomPanelProps {
  meetingId: string;
  waiting: WaitingParticipant[];
  onParticipantHandled: (participantName: string) => void;
}

export default function WaitingRoomPanel({
  meetingId,
  waiting,
  onParticipantHandled,
}: WaitingRoomPanelProps) {
  const { t } = useTranslation();
  const [processing, setProcessing] = useState<Set<string>>(new Set());

  const handleApprove = async (participantName: string) => {
    setProcessing((prev) => new Set(prev).add(participantName));
    try {
      await roomApi.approveParticipant({ meetingId, participantName });
      onParticipantHandled(participantName);
    } catch (err) {
      console.error("Failed to approve participant:", err);
    } finally {
      setProcessing((prev) => {
        const next = new Set(prev);
        next.delete(participantName);
        return next;
      });
    }
  };

  const handleReject = async (participantName: string) => {
    setProcessing((prev) => new Set(prev).add(participantName));
    try {
      await roomApi.rejectParticipant({ meetingId, participantName });
      onParticipantHandled(participantName);
    } catch (err) {
      console.error("Failed to reject participant:", err);
    } finally {
      setProcessing((prev) => {
        const next = new Set(prev);
        next.delete(participantName);
        return next;
      });
    }
  };

  const handleAdmitAll = async () => {
    for (const participant of waiting) {
      await handleApprove(participant.participantName);
    }
  };

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: "auto",
        padding: "var(--space-md)",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography as="h3" variant="titleSm">
          {t("sidebar.waitingRoom")}
        </Typography>
        {waiting.length > 1 && (
          <InlineButton variant="primary" size="xs" onClick={handleAdmitAll}>
            {t("waiting.admitAll")}
          </InlineButton>
        )}
      </div>

      {waiting.length === 0 ? (
        <Typography as="p" variant="bodySm" tone="tertiary">
          {t("waiting.noParticipants")}
        </Typography>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {waiting.map((participant) => (
            <div
              key={participant.participantName}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                background: "var(--bg-primary)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <Typography as="span" variant="bodySm">
                {participant.participantName}
              </Typography>
              <div style={{ display: "flex", gap: 6 }}>
                <InlineButton
                  variant="primary"
                  size="xs"
                  onClick={() => handleApprove(participant.participantName)}
                  loading={processing.has(participant.participantName)}
                >
                  {t("waiting.admit")}
                </InlineButton>
                <InlineButton
                  variant="danger"
                  size="xs"
                  onClick={() => handleReject(participant.participantName)}
                  loading={processing.has(participant.participantName)}
                >
                  {t("waiting.reject")}
                </InlineButton>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
