"use client";

import type { PreviewerProps } from "./types";

export function PdfPreviewer({ fileUrl, fileName }: PreviewerProps) {
  return (
    <iframe
      src={fileUrl}
      title={fileName}
      style={{ width: "100%", height: "75vh", border: "none", borderRadius: "var(--radius-sm)" }}
    />
  );
}
