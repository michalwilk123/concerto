"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import type { PreviewerProps } from "./types";

export function TextPreviewer({ fileUrl }: PreviewerProps) {
  const { t } = useTranslation();
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const controller = new AbortController();

    fetch(fileUrl, { signal: controller.signal })
      .then((res) => res.text())
      .then((text) => {
        setContent(text);
        setStatus("ready");
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setStatus("error");
      });

    return () => {
      controller.abort();
    };
  }, [fileUrl]);

  if (status === "loading") {
    return <p style={{ color: "var(--text-secondary)" }}>{t("preview.loading")}</p>;
  }
  if (status === "error") {
    return <p style={{ color: "var(--accent-red)" }}>{t("preview.textLoadFailed")}</p>;
  }

  return (
    <div style={{ width: "100%", maxWidth: 960, margin: "0 auto", padding: "0 16px" }}>
      <pre
        style={{
          whiteSpace: "pre-wrap",
          fontSize: "0.875rem",
          fontFamily: "monospace",
          color: "var(--text-primary)",
          lineHeight: 1.6,
        }}
      >
        {content}
      </pre>
    </div>
  );
}
