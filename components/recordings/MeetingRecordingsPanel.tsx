"use client";

import { Download, Film, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { ButtonGroup } from "@/components/ui/button-group";
import { EmptyState } from "@/components/ui/empty-state";
import { EntityListRow } from "@/components/ui/entity-list-row";
import { IconButton } from "@/components/ui/icon-button";
import { LoadingIndicator } from "@/components/ui/loading-state";
import { recordingsApi } from "@/lib/api-client";
import { useTranslation } from "@/hooks/useTranslation";
import type { Recording } from "@/types/recording";

interface MeetingRecordingsPanelProps {
  meetingId: string;
  groupId: string;
}

const RECORDING_RETENTION_DAYS = 6;
const DAY_MS = 24 * 60 * 60 * 1000;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
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

function getDaysLeft(lastModifiedIso: string): number {
  const createdAt = new Date(lastModifiedIso).getTime();
  const expiresAt = createdAt + RECORDING_RETENTION_DAYS * DAY_MS;
  const remainingMs = expiresAt - Date.now();
  return Math.max(0, Math.ceil(remainingMs / DAY_MS));
}

export function MeetingRecordingsPanel({ meetingId, groupId }: MeetingRecordingsPanelProps) {
  const { t } = useTranslation();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setPlayingUrl(null);
    recordingsApi
      .list(groupId, meetingId)
      .then(setRecordings)
      .catch(() => setRecordings([]))
      .finally(() => setIsLoading(false));
  }, [groupId, meetingId]);

  if (isLoading) {
    return <LoadingIndicator message={t("recordings.loadingMessage")} size={20} minHeight={80} />;
  }

  if (recordings.length === 0) {
    return (
      <div style={{ padding: "16px 12px" }}>
        <EmptyState
          icon={<Film size={32} />}
          title={t("recordings.emptyTitle")}
          subtitle={t("recordings.emptySubtitle")}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: "8px var(--space-md)", overflow: "hidden", minWidth: 0 }}>
      {playingUrl && (
        <div
          style={{
            marginBottom: 12,
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
            background: "#000",
          }}
        >
          <video
            src={playingUrl}
            controls
            autoPlay
            style={{ width: "100%", maxHeight: 240, display: "block" }}
          >
            <track
              kind="captions"
              srcLang="en"
              label={t("recordings.englishCaptions")}
              src={"data:text/vtt,WEBVTT"}
            />
          </video>
          <ButtonGroup
            variant="toolbar"
            size="sm"
            className="m-1.5"
            items={[
              {
                id: "closePlayer",
                label: t("recordings.closePlayer"),
                onClick: () => setPlayingUrl(null),
              },
            ]}
          />
        </div>
      )}

      <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
        {recordings.map((rec) => (
          <div
            key={rec.id}
            style={{ minWidth: 0 }}
            title={t("recordings.daysLeft", { days: String(getDaysLeft(rec.lastModified)) })}
          >
            <EntityListRow
              selected={playingUrl === rec.url}
              icon={
                <IconButton
                  variant="circle"
                  size="md"
                  onClick={() => setPlayingUrl(rec.url)}
                  title={t("recordings.playTitle")}
                  style={{
                    width: 28,
                    height: 28,
                    background: "var(--accent-purple)",
                    color: "#fff",
                  }}
                >
                  <Play size={12} fill="#fff" />
                </IconButton>
              }
              title={rec.name}
              subtitle={
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    display: "block",
                  }}
                >
                  {formatSize(rec.size)} &middot; {formatDate(rec.lastModified)}
                </span>
              }
              actions={
                <ButtonGroup
                  variant="toolbar"
                  size="sm"
                  items={[
                    {
                      id: "download",
                      label: t("recordings.downloadTitle"),
                      ariaLabel: t("recordings.downloadTitle"),
                      quiet: true,
                      asChild: true,
                      children: (
                        <a href={rec.url} download>
                          <Download size={14} />
                          <span>{t("recordings.downloadTitle")}</span>
                        </a>
                      ),
                    },
                  ]}
                />
              }
              style={{ padding: "8px 12px", gap: 8 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
