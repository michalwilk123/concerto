"use client";

import type { PreviewerProps } from "./types";

export function UnsupportedPreviewer({ mimeType }: PreviewerProps) {
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
					Preview not available for this file type
				</p>
				<p style={{ color: "var(--text-tertiary)", fontSize: "0.875rem" }}>{mimeType}</p>
			</div>
		</div>
	);
}
