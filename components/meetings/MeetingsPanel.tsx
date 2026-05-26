"use client";

import {
  CalendarDays,
  Globe,
  Lock,
  Plus,
  RotateCcw,
  Shield,
  ShieldOff,
  Trash2,
  Video,
} from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { CreateMeetingModal } from "@/components/CreateMeetingModal";
import { EmptyState } from "@/components/ui/empty-state";
import { EntityListRow } from "@/components/ui/entity-list-row";
import { IconButton } from "@/components/ui/icon-button";
import { InlineButton } from "@/components/ui/inline-button";
import { LoadingIndicator } from "@/components/ui/loading-state";
import { Typography } from "@/components/ui/typography";
import { roomApi } from "@/lib/api-client";
import { useMeetingsStore } from "@/stores/meetings-store";
import { useTranslation } from "@/hooks/useTranslation";
import type { Meeting } from "@/types/meeting";

interface MeetingsPanelProps {
  groupId: string;
  selectedMeetingId?: string;
  onSelectMeeting?: (id: string) => void;
  headerExtra?: React.ReactNode;
  isPrivileged?: boolean;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MeetingsPanel({
  groupId,
  selectedMeetingId,
  onSelectMeeting,
  headerExtra,
  isPrivileged = true,
}: MeetingsPanelProps) {
  const router = useRouter();
  const { meetings, isLoading, fetchMeetings, patchMeeting, deleteMeeting } = useMeetingsStore();
  const { t } = useTranslation();
  const [showCreateMeeting, setShowCreateMeeting] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    fetchMeetings(groupId);
  }, [groupId, fetchMeetings]);

  if (isLoading) {
    return (
      <LoadingIndicator
        message={t("meetings.loadingMessage")}
        size={28}
        containerStyle={{ height: "60vh" }}
      />
    );
  }

  return (
    <div>
      <CreateMeetingModal
        open={showCreateMeeting}
        onClose={() => setShowCreateMeeting(false)}
        onCreated={(meetingId) => router.push(`/meet/${meetingId}`)}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <Typography as="h2" variant="titleMd">
          {t("meetings.title")}
        </Typography>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isPrivileged && (
            <InlineButton
              variant="accent"
              size="sm"
              onClick={() => setShowCreateMeeting(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                fontSize: "0.84rem",
              }}
            >
              <Plus size={16} />
              {t("meetings.createButton")}
            </InlineButton>
          )}
          {headerExtra}
        </div>
      </div>

      {actionError && (
        <p
          style={{
            color: "var(--accent-red)",
            fontSize: "0.85rem",
            margin: "0 0 12px",
          }}
        >
          {actionError}
        </p>
      )}

      {meetings.length === 0 ? (
        <EmptyState
          icon={<Video size={48} />}
          title={t("meetings.emptyTitle")}
          subtitle={t("meetings.emptySubtitle")}
        />
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {meetings.map((m) => (
            <MeetingItem
              key={m.id}
              meeting={m}
              isSelected={selectedMeetingId === m.id}
              isPrivileged={isPrivileged}
              onSelect={onSelectMeeting ? () => onSelectMeeting(m.id) : undefined}
              onRejoin={async () => {
                try {
                  const { meetingId } = await roomApi.rejoin({ meetingId: m.id, groupId });
                  router.push(`/meet/${meetingId}`);
                } catch (err) {
                  console.error("Failed to rejoin meeting:", err);
                }
              }}
              onTogglePublic={async (isPublic) => {
                setActionError("");
                try {
                  await patchMeeting(m.id, { isPublic });
                } catch {
                  setActionError(t("meetings.updateFailed"));
                }
              }}
              onToggleApproval={async (requiresApproval) => {
                setActionError("");
                try {
                  await patchMeeting(m.id, { requiresApproval });
                } catch {
                  setActionError(t("meetings.updateFailed"));
                }
              }}
              onDelete={async () => {
                setActionError("");
                try {
                  await deleteMeeting(m.id);
                } catch {
                  setActionError(t("meetings.deleteFailed"));
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MeetingItem({
  meeting,
  isSelected,
  isPrivileged = true,
  onSelect,
  onRejoin,
  onTogglePublic,
  onToggleApproval,
  onDelete,
}: {
  meeting: Meeting;
  isSelected?: boolean;
  isPrivileged?: boolean;
  onSelect?: () => void;
  onRejoin: () => void;
  onTogglePublic: (isPublic: boolean) => void;
  onToggleApproval: (requiresApproval: boolean) => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { t } = useTranslation();

  return (
    <EntityListRow
      onClick={onSelect}
      selected={isSelected}
      icon={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "var(--accent-purple)",
            color: "#fff",
          }}
        >
          <Video size={16} />
        </div>
      }
      title={meeting.name}
      subtitle={
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <CalendarDays size={12} />
          <Typography as="span" variant="meta" tone="tertiary" style={{ color: "inherit" }}>
            {formatDate(meeting.createdAt)}
          </Typography>
        </span>
      }
      actions={
        <>
          {isPrivileged && (
            <IconButton
              variant="square"
              size="md"
              onClick={() => onTogglePublic(!meeting.isPublic)}
              title={meeting.isPublic ? t("meetings.makePrivate") : t("meetings.makePublic")}
              style={{
                width: 32,
                height: 32,
                border: "1px solid var(--border-default)",
                background: "var(--bg-primary)",
                color: meeting.isPublic ? "var(--accent-purple)" : "var(--text-tertiary)",
                flexShrink: 0,
              }}
            >
              {meeting.isPublic ? <Globe size={16} /> : <Lock size={16} />}
            </IconButton>
          )}

          {isPrivileged && (
            <IconButton
              variant="square"
              size="md"
              onClick={() => onToggleApproval(!meeting.requiresApproval)}
              title={
                meeting.requiresApproval
                  ? t("meetings.disableApproval")
                  : t("meetings.enableApproval")
              }
              style={{
                width: 32,
                height: 32,
                border: "1px solid var(--border-default)",
                background: "var(--bg-primary)",
                color: meeting.requiresApproval ? "var(--accent-purple)" : "var(--text-tertiary)",
                flexShrink: 0,
              }}
            >
              {meeting.requiresApproval ? <Shield size={16} /> : <ShieldOff size={16} />}
            </IconButton>
          )}

          <InlineButton
            variant="secondary"
            size="xs"
            onClick={onRejoin}
            title={t("meetings.rejoinTitle")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "6px 10px",
              color: "var(--text-secondary)",
              fontSize: "0.78rem",
              flexShrink: 0,
            }}
          >
            <RotateCcw size={14} />
            {t("meetings.rejoin")}
          </InlineButton>

          {isPrivileged && (confirmDelete ? (
            <>
              <InlineButton
                variant="danger"
                size="xs"
                onClick={() => {
                  onDelete();
                  setConfirmDelete(false);
                }}
                style={{
                  padding: "6px 10px",
                  fontSize: "0.78rem",
                }}
              >
                {t("meetings.confirm")}
              </InlineButton>
              <InlineButton
                variant="secondary"
                size="xs"
                onClick={() => setConfirmDelete(false)}
                style={{
                  padding: "6px 10px",
                  color: "var(--text-secondary)",
                  fontSize: "0.78rem",
                }}
              >
                {t("meetings.cancel")}
              </InlineButton>
            </>
          ) : (
            <IconButton
              variant="square"
              size="md"
              onClick={() => setConfirmDelete(true)}
              title={t("meetings.deleteTitle")}
              style={{
                width: 32,
                height: 32,
                border: "1px solid var(--border-default)",
                background: "var(--bg-primary)",
                color: "var(--text-secondary)",
                flexShrink: 0,
              }}
            >
              <Trash2 size={16} />
            </IconButton>
          ))}
        </>
      }
    />
  );
}
