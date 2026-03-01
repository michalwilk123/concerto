"use client";

import { useEffect, useState } from "react";
import { InlineButton } from "@/components/ui/inline-button";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { TextInput } from "@/components/ui/text-input";
import { Typography } from "@/components/ui/typography";
import { useTranslation } from "@/hooks/useTranslation";
import { groupsApi, roomApi } from "@/lib/api-client";
import type { Group } from "@/types/group";

interface CreateMeetingModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (meetingId: string) => void;
  defaultName?: string;
}

export function CreateMeetingModal({
  open,
  onClose,
  onCreated,
  defaultName = "",
}: CreateMeetingModalProps) {
  const { t } = useTranslation();
  const [meetingName, setMeetingName] = useState(defaultName);
  const [groupId, setGroupId] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchingGroups, setFetchingGroups] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    setError(null);
    setFetchingGroups(true);

    groupsApi
      .list()
      .then((g) => {
        if (cancelled) return;
        setGroups(g);
        setGroupId((prev) => prev || g[0]?.id || "");
      })
      .catch(() => {
        if (!cancelled) setError(t("createMeeting.loadGroupsFailed"));
      })
      .finally(() => {
        if (!cancelled) setFetchingGroups(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, t]);

  useEffect(() => {
    if (open) {
      setMeetingName(defaultName);
      setIsPublic(false);
      setRequiresApproval(false);
    }
  }, [open, defaultName]);

  const handleSubmit = async () => {
    if (!meetingName.trim() || !groupId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await roomApi.create({
        displayName: meetingName.trim(),
        groupId,
        isPublic,
        requiresApproval,
      });
      onCreated(data.meetingId);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("createMeeting.createFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} maxWidth={420}>
      <div style={{ padding: 24 }}>
        <Typography as="h2" variant="titleMd" style={{ margin: "0 0 20px 0" }}>
          {t("createMeeting.title")}
        </Typography>

        {error && (
          <div
            style={{
              padding: "8px 12px",
              marginBottom: 16,
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: "var(--radius-md)",
              color: "#f87171",
              fontSize: "0.82rem",
            }}
          >
            {error}
          </div>
        )}

        <label htmlFor="create-meeting-name" style={{ display: "block", marginBottom: 6 }}>
          <Typography as="span" variant="label" tone="secondary">
            {t("createMeeting.nameLabel")}
          </Typography>
        </label>
        <TextInput
          id="create-meeting-name"
          value={meetingName}
          onChange={(e) => setMeetingName(e.target.value)}
          placeholder={t("createMeeting.namePlaceholder")}
          style={{ width: "100%", marginBottom: 16, fontSize: "0.84rem" }}
        />

        <label htmlFor="create-meeting-group" style={{ display: "block", marginBottom: 6 }}>
          <Typography as="span" variant="label" tone="secondary">
            {t("createMeeting.groupLabel")}
          </Typography>
        </label>
        {fetchingGroups ? (
          <Typography as="p" variant="bodySm" tone="tertiary" style={{ margin: "0 0 16px" }}>
            {t("createMeeting.loadingGroups")}
          </Typography>
        ) : groups.length === 0 ? (
          <Typography as="p" variant="bodySm" tone="tertiary" style={{ margin: "0 0 16px" }}>
            {t("createMeeting.noGroups")}
          </Typography>
        ) : (
          <Select
            id="create-meeting-group"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            style={{
              width: "100%",
              marginBottom: 16,
            }}
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>
        )}

        <label
          htmlFor="create-meeting-public"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
            cursor: "pointer",
          }}
        >
          <input
            id="create-meeting-public"
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            style={{ width: 16, height: 16, cursor: "pointer" }}
          />
          <Typography as="span" variant="bodySm" tone="secondary">
            {t("createMeeting.publicLabel")}
          </Typography>
        </label>

        <label
          htmlFor="create-meeting-approval"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 20,
            cursor: "pointer",
          }}
        >
          <input
            id="create-meeting-approval"
            type="checkbox"
            checked={requiresApproval}
            onChange={(e) => setRequiresApproval(e.target.checked)}
            style={{ width: 16, height: 16, cursor: "pointer" }}
          />
          <Typography as="span" variant="bodySm" tone="secondary">
            {t("createMeeting.requiresApprovalLabel")}
          </Typography>
        </label>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <InlineButton variant="secondary" size="sm" onClick={onClose}>
            {t("createMeeting.cancel")}
          </InlineButton>
          <InlineButton
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            loading={loading}
            disabled={!meetingName.trim() || !groupId || groups.length === 0}
          >
            {t("createMeeting.submit")}
          </InlineButton>
        </div>
      </div>
    </Modal>
  );
}
