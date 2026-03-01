"use client";

import { Files, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FilePreviewModal } from "@/components/dashboard/preview/FilePreviewModal";
import { useToast } from "@/components/Toast";
import { useTranslation } from "@/hooks/useTranslation";
import { filesApi, meetingFilesApi } from "@/lib/api-client";
import type { FileWithUrl } from "@/types/files";

interface MeetingFilesPanelProps {
  meetingId: string;
  allowManage: boolean;
}

export function MeetingFilesPanel({ meetingId, allowManage }: MeetingFilesPanelProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const [files, setFiles] = useState<FileWithUrl[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileWithUrl | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadInFlightRef = useRef(false);

  const fetchFiles = async () => {
    try {
      const list = await meetingFilesApi.list(meetingId);
      setFiles(list);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    setFiles([]);
    fetchFiles().catch(() => {
      setIsLoading(false);
    });
  }, [meetingId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpload = async (file: File) => {
    if (uploadInFlightRef.current) return;
    uploadInFlightRef.current = true;
    setUploading(true);
    try {
      await meetingFilesApi.upload({ file, meetingId });
      await fetchFiles();
      toast.success(t("files.uploadSuccess"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("files.uploadFailed"));
    } finally {
      uploadInFlightRef.current = false;
      setUploading(false);
    }
  };

  const handleDelete = async (fileId: string) => {
    try {
      await filesApi.delete(fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      if (previewFile?.id === fileId) setPreviewFile(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("files.deleteFailed"));
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (uploadInFlightRef.current) return;
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    for (const file of droppedFiles) {
      await handleUpload(file);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (uploadInFlightRef.current) return;
    const selected = Array.from(e.target.files ?? []);
    for (const file of selected) {
      await handleUpload(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      {/* Upload area */}
      {allowManage && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (uploadInFlightRef.current) return;
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => {
            if (uploadInFlightRef.current) return;
            fileInputRef.current?.click();
          }}
          style={{
            margin: "var(--space-md)",
            padding: "var(--space-md)",
            border: `2px dashed ${isDragging ? "var(--accent-purple)" : "var(--border-subtle)"}`,
            borderRadius: "var(--radius-md)",
            background: isDragging ? "var(--bg-hover)" : "transparent",
            cursor: uploading ? "wait" : "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "var(--space-xs)",
            transition: "border-color 0.15s, background 0.15s",
          }}
        >
          <Upload size={18} style={{ color: "var(--text-secondary)" }} />
          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
            {uploading ? t("files.uploading") : t("files.uploadHint")}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            style={{ display: "none" }}
            onChange={handleFileInput}
          />
        </div>
      )}

      {/* File list */}
      <div style={{ flex: 1, overflow: "auto", padding: "0 var(--space-md) var(--space-md)" }}>
        {!isLoading && files.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "var(--space-sm)",
              paddingTop: "var(--space-xl)",
              color: "var(--text-secondary)",
            }}
          >
            <Files size={32} />
            <span style={{ fontSize: "0.85rem" }}>{t("files.empty")}</span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
            {files.map((file) => (
              <div
                key={file.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-sm)",
                  padding: "var(--space-sm)",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--bg-tertiary)",
                }}
              >
                <button
                  type="button"
                  onClick={() => setPreviewFile(file)}
                  style={{
                    flex: 1,
                    fontSize: "0.82rem",
                    color: "var(--text-primary)",
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    textAlign: "left",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                  }}
                  title={file.name}
                >
                  {file.name}
                </button>
                {allowManage && (
                  <button
                    type="button"
                    onClick={() => handleDelete(file.id)}
                    title={t("files.delete")}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--text-secondary)",
                      padding: 2,
                      display: "flex",
                      flexShrink: 0,
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <FilePreviewModal
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        fileName={previewFile?.name ?? ""}
        fileUrl={previewFile?.url ?? null}
        mimeType={previewFile?.mimeType ?? ""}
      />
    </div>
  );
}
