"use client";

import { Video } from "lucide-react";
import { useEffect, useState } from "react";
import { CreateMeetingModal } from "@/components/CreateMeetingModal";
import { Button } from "@/components/ui/button";
import { ButtonGroup, type ButtonGroupItem } from "@/components/ui/button-group";
import { DataTableShell } from "@/components/ui/data-table-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { EntityGridRow } from "@/components/ui/entity-list-row";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Typography } from "@/components/ui/typography";
import { useTranslation } from "@/hooks/useTranslation";
import { useRouter } from "@/i18n/navigation";
import { roomApi } from "@/lib/api-client";
import { useMeetingsStore } from "@/stores/meetings-store";
import type { Meeting } from "@/types/meeting";
import {
  MANAGE_TABLE_MAX_WIDTH,
  MANAGE_TABLE_MIN_WIDTH,
} from "@/components/manage/table-layout";

// Column tracks sum to 920 so the table lines up with the manage tables
// (920 + 40px padding === MANAGE_TABLE_MIN_WIDTH). The two setting selects only
// hold short values (Yes/No, Anyone/Group only), so their columns are narrow and
// the freed width goes to the Name column. The "Needs approval" column gets a bit
// more width so its header stays on one line.
const MEETINGS_TABLE_COLUMNS = "350px 150px 130px 100px 190px";

// Fixed width for the two setting selects so they hug their short values
// (Yes/No, Anyone/Group only) instead of stretching to fill the column.
const SETTING_SELECT_WIDTH = 92;

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

  const headers = [
    t("meetings.tableName"),
    t("meetings.tableCreated"),
    t("meetings.tableNeedsApproval"),
    t("meetings.tableCanBeSeen"),
    t("meetings.tableActions"),
  ];

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
          maxWidth: MANAGE_TABLE_MAX_WIDTH,
          margin: "0 auto 16px",
        }}
      >
        <Typography as="h2" variant="titleMd">
          {t("meetings.title")}
        </Typography>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isPrivileged && (
            <Button variant="primary" size="sm" onClick={() => setShowCreateMeeting(true)}>
              {t("meetings.createButton")}
            </Button>
          )}
          {headerExtra}
        </div>
      </div>

      {actionError && (
        <p
          style={{
            color: "var(--accent-red)",
            fontSize: "0.85rem",
            margin: "0 auto 12px",
            maxWidth: MANAGE_TABLE_MAX_WIDTH,
          }}
        >
          {actionError}
        </p>
      )}

      <DataTableShell
        name="meetings"
        headers={headers}
        headerLabels={headers}
        columns={MEETINGS_TABLE_COLUMNS}
        minTableWidth={MANAGE_TABLE_MIN_WIDTH}
        containerStyle={{ maxWidth: MANAGE_TABLE_MAX_WIDTH, margin: "0 auto" }}
        isLoading={isLoading}
        hasRows={meetings.length > 0}
        emptyState={
          <EmptyState
            icon={<Video size={32} />}
            title={t("meetings.emptyTitle")}
            subtitle={t("meetings.emptySubtitle")}
            padding="48px 20px"
          />
        }
      >
        {meetings.map((m, i) => (
          <MeetingRow
            key={m.id}
            meeting={m}
            isLast={i === meetings.length - 1}
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
            onPatch={async (patch) => {
              setActionError("");
              try {
                await patchMeeting(m.id, patch);
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
      </DataTableShell>
    </div>
  );
}

function MeetingRow({
  meeting,
  isLast,
  isSelected,
  isPrivileged = true,
  onSelect,
  onRejoin,
  onPatch,
  onDelete,
}: {
  meeting: Meeting;
  isLast: boolean;
  isSelected?: boolean;
  isPrivileged?: boolean;
  onSelect?: () => void;
  onRejoin: () => void;
  onPatch: (patch: { isPublic?: boolean; requiresApproval?: boolean }) => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { t } = useTranslation();

  const actionItems: ButtonGroupItem[] = [
    {
      id: "rejoin",
      label: t("meetings.rejoin"),
      ariaLabel: t("meetings.rejoinTitle"),
      quiet: true,
      onClick: onRejoin,
    },
  ];

  if (isPrivileged) {
    if (confirmDelete) {
      actionItems.push({
        id: "confirmDelete",
        label: t("meetings.confirm"),
        tone: "danger",
        onClick: () => {
          onDelete();
          setConfirmDelete(false);
        },
      });
      actionItems.push({
        id: "cancelDelete",
        label: t("meetings.cancel"),
        onClick: () => setConfirmDelete(false),
      });
    } else {
      actionItems.push({
        id: "delete",
        label: t("meetings.deleteButton"),
        ariaLabel: t("meetings.deleteTitle"),
        quiet: true,
        tone: "danger",
        onClick: () => setConfirmDelete(true),
      });
    }
  }

  return (
    <EntityGridRow
      columns={MEETINGS_TABLE_COLUMNS}
      isLast={isLast}
      style={{
        cursor: onSelect ? "pointer" : undefined,
        // Selected rows use the app's purple accent (see EntityListRow) rather than
        // bg-tertiary, which matches the table header and made selection invisible.
        // Inset box-shadow draws the purple outline without shifting the grid layout.
        background: isSelected
          ? "color-mix(in srgb, var(--accent-purple) 10%, transparent)"
          : undefined,
        boxShadow: isSelected ? "inset 0 0 0 1px var(--accent-purple)" : undefined,
      }}
    >
      <Typography variant="bodySm" weight={500} truncate>
        {onSelect ? (
          <button
            type="button"
            onClick={onSelect}
            style={{
              appearance: "none",
              background: "none",
              border: "none",
              padding: 0,
              margin: 0,
              font: "inherit",
              color: "inherit",
              textAlign: "left",
              cursor: "pointer",
              width: "100%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {meeting.name}
          </button>
        ) : (
          meeting.name
        )}
      </Typography>

      <Typography variant="meta" tone="tertiary">
        {formatDate(meeting.createdAt)}
      </Typography>

      {/* Needs approval → requiresApproval */}
      {isPrivileged ? (
        <div style={{ width: SETTING_SELECT_WIDTH }} onClick={(e) => e.stopPropagation()}>
          <Select
            value={meeting.requiresApproval ? "yes" : "no"}
            onValueChange={(value) => onPatch({ requiresApproval: value === "yes" })}
          >
            <SelectTrigger variant="compact" aria-label={t("meetings.tableNeedsApproval")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">{t("meetings.approvalYes")}</SelectItem>
              <SelectItem value="no">{t("meetings.approvalNo")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : (
        <Typography variant="bodySm" tone="secondary">
          {meeting.requiresApproval ? t("meetings.approvalYes") : t("meetings.approvalNo")}
        </Typography>
      )}

      {/* Can be seen → isPublic */}
      {isPrivileged ? (
        <div style={{ width: SETTING_SELECT_WIDTH }} onClick={(e) => e.stopPropagation()}>
          <Select
            value={meeting.isPublic ? "anyone" : "group"}
            onValueChange={(value) => onPatch({ isPublic: value === "anyone" })}
          >
            <SelectTrigger variant="compact" aria-label={t("meetings.tableCanBeSeen")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="anyone">{t("meetings.visibilityAnyone")}</SelectItem>
              <SelectItem value="group">{t("meetings.visibilityGroup")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : (
        <Typography variant="bodySm" tone="secondary">
          {meeting.isPublic ? t("meetings.visibilityAnyone") : t("meetings.visibilityGroup")}
        </Typography>
      )}

      <div
        style={{ display: "flex", justifyContent: "center" }}
        onClick={(e) => e.stopPropagation()}
      >
        <ButtonGroup
          variant="toolbar"
          size="sm"
          collapse="never"
          aria-label={t("meetings.tableActions")}
          items={actionItems}
        />
      </div>
    </EntityGridRow>
  );
}
