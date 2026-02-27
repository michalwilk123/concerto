"use client";

import { Shield, ShieldOff } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { InlineButton } from "@/components/ui/inline-button";
import { useTranslation } from "@/hooks/useTranslation";
import { meetingsApi, roomApi } from "@/lib/api-client";
import { useRoomStore } from "@/stores/room-store";
import type { Role, RoomParticipant } from "@/types/room";
import { isTeacher, presetToRole } from "@/types/room";
import ConfirmDialog from "./ConfirmDialog";
import { useToast } from "./Toast";

interface ParticipantMenuProps {
  participants: RoomParticipant[];
}

export default function ParticipantMenu({ participants }: ParticipantMenuProps) {
  const { meetingId, participantName, role } = useRoomStore();
  const { t } = useTranslation();
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [kickTarget, setKickTarget] = useState<string | null>(null);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [togglingApproval, setTogglingApproval] = useState(false);
  const toast = useToast();

  const isTeacherRole = isTeacher(role);

  useEffect(() => {
    if (!meetingId || !isTeacherRole) return;
    meetingsApi.get(meetingId).then((m) => setRequiresApproval(m.requiresApproval)).catch(() => {});
  }, [meetingId, isTeacherRole]);

  const handleToggleApproval = async () => {
    if (togglingApproval) return;
    setTogglingApproval(true);
    const next = !requiresApproval;
    try {
      await meetingsApi.patch(meetingId, { requiresApproval: next });
      setRequiresApproval(next);
    } catch {
      toast.error(t("meetings.updateFailed"));
    } finally {
      setTogglingApproval(false);
    }
  };

  const handleKick = async (targetName: string) => {
    setKickTarget(null);
    try {
      await roomApi.kick({ meetingId, targetIdentity: targetName });
      toast.success(t("participants.kickedSuccess", { name: targetName }));
      setShowMenu(false);
      setSelectedParticipant(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("participants.kickFailed"));
    }
  };

  const getParticipantRole = (participant: RoomParticipant): Role => {
    return presetToRole(participant.presetName);
  };

  const toggleMenu = (name: string) => {
    if (selectedParticipant === name && showMenu) {
      setShowMenu(false);
      setSelectedParticipant(null);
    } else {
      setSelectedParticipant(name);
      setShowMenu(true);
    }
  };

  const getRoleBadge = (participantRole: string) => {
    switch (participantRole) {
      case "teacher":
        return { label: t("participants.teacher"), bg: "var(--accent-green)" };
      default:
        return { label: t("participants.student"), bg: "var(--accent-purple, #8b5cf6)" };
    }
  };

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "var(--space-lg)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "var(--space-md)",
        }}
      >
        <div
          style={{
            fontSize: "0.75rem",
            color: "var(--text-tertiary)",
            fontWeight: 500,
          }}
        >
          {t("participants.count", { count: String(participants.length) })}
        </div>
        {isTeacherRole && (
          <button
            onClick={handleToggleApproval}
            disabled={togglingApproval}
            title={requiresApproval ? t("meetings.disableApproval") : t("meetings.enableApproval")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "3px 8px",
              background: requiresApproval ? "rgba(139,92,246,0.15)" : "var(--bg-tertiary)",
              border: `1px solid ${requiresApproval ? "var(--accent-purple)" : "var(--border-subtle)"}`,
              borderRadius: "var(--radius-sm)",
              color: requiresApproval ? "var(--accent-purple)" : "var(--text-tertiary)",
              fontSize: "0.7rem",
              cursor: togglingApproval ? "wait" : "pointer",
              opacity: togglingApproval ? 0.6 : 1,
              transition: "all 0.15s ease",
            }}
          >
            {requiresApproval ? <Shield size={11} /> : <ShieldOff size={11} />}
            {requiresApproval ? t("meetings.disableApproval") : t("meetings.enableApproval")}
          </button>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
        {participants.map((participant) => {
          const participantRole = getParticipantRole(participant);
          const badge = getRoleBadge(participantRole);
          const isSelf = participant.name === participantName;
          const isSelected = selectedParticipant === participant.name && showMenu;

          return (
            <div key={participant.id}>
              <button
                onClick={() => !isSelf && isTeacherRole && toggleMenu(participant.name)}
                style={{
                  width: "100%",
                  padding: "var(--space-sm) var(--space-md)",
                  background: isSelected ? "var(--bg-elevated)" : "var(--bg-tertiary)",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text-primary)",
                  cursor: isSelf || !isTeacherRole ? "default" : "pointer",
                  textAlign: "left",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: "0.875rem" }}>
                  {participant.name}
                  {isSelf && (
                    <span style={{ color: "var(--text-tertiary)", marginLeft: "var(--space-xs)" }}>
                      ({t("participants.you")})
                    </span>
                  )}
                </span>
                <Badge label={badge.label} color={badge.bg} />
              </button>
              {isSelected && !isSelf && isTeacherRole && (
                <div
                  style={{
                    marginTop: "var(--space-xs)",
                    padding: "var(--space-sm)",
                    background: "var(--bg-tertiary)",
                    borderRadius: "var(--radius-sm)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--space-xs)",
                  }}
                >
                  {participantRole !== "teacher" && (
                    <InlineButton
                      variant="danger"
                      size="sm"
                      onClick={() => setKickTarget(participant.name)}
                      style={{ borderRadius: "var(--radius-sm)" }}
                    >
                      {t("participants.kick")}
                    </InlineButton>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={!!kickTarget}
        title={t("participants.kickTitle")}
        message={t("participants.kickMessage", { name: kickTarget ?? "" })}
        confirmLabel={t("participants.kick")}
        cancelLabel={t("participants.cancel")}
        variant="danger"
        onConfirm={() => kickTarget && handleKick(kickTarget)}
        onCancel={() => setKickTarget(null)}
      />
    </div>
  );
}
