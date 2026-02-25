"use client";

import type { PreviewerProps } from "./types";
import { useTranslation } from "@/hooks/useTranslation";

export function UnsupportedPreviewer({ mimeType }: PreviewerProps) {
	const { t } = useTranslation();

	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				padding: 32,
				textAlign: "center",
			}}
		>
			<div>
				<p style={{ color: "var(--text-secondary)", fontSize: "1.1rem", marginBottom: 8 }}>
					{t("preview.notAvailable")}
				</p>
				<p style={{ color: "var(--text-tertiary)", fontSize: "0.875rem" }}>{mimeType}</p>
			</div>
		</div>
	);
}
