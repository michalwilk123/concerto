"use client";

import { useEffect, useRef } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import type { PreviewerProps } from "./types";

export function VideoPreviewer({ fileUrl }: PreviewerProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    return () => {
      videoRef.current?.pause();
    };
  }, []);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <video ref={videoRef} controls style={{ maxWidth: "100%", maxHeight: "70vh" }} src={fileUrl}>
        {t("preview.videoNotSupported")}
      </video>
    </div>
  );
}
