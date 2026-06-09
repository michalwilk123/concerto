"use client";

import { Upload } from "lucide-react";
import { useRef, useState } from "react";
import { InlineButton } from "@/components/ui/inline-button";
import { useTranslation } from "@/hooks/useTranslation";
import { filesApi, meetingFilesApi } from "@/lib/api-client";
import type { FileWithUrl } from "@/types/files";

interface FileUploaderProps {
  groupId: string;
  folderId?: string | null;
  meetingId?: string;
  compact?: boolean;
  onUploadComplete?: (file: FileWithUrl) => void;
}

export function FileUploader({
  groupId,
  folderId,
  meetingId,
  compact = false,
  onUploadComplete,
}: FileUploaderProps) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    try {
      setUploading(true);
      const uploaded = meetingId
        ? await meetingFilesApi.upload({ file, meetingId, folderId })
        : await filesApi.upload({ file, groupId, folderId });
      setUploading(false);
      onUploadComplete?.(uploaded);
    } catch (error) {
      console.error(t("uploader.uploadFailed"), error);
      setUploading(false);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
          e.target.value = "";
        }}
        disabled={uploading}
      />
      <InlineButton
        variant="accent"
        size={compact ? "sm" : "md"}
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        style={{ display: "flex", alignItems: "center", gap: compact ? 0 : 8 }}
        title={uploading ? t("uploader.uploading") : t("uploader.uploadFile")}
      >
        <Upload size={compact ? 14 : 16} />
        {uploading ? t("uploader.uploading") : t("uploader.uploadFile")}
      </InlineButton>
    </>
  );
}
