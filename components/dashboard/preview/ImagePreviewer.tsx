"use client";

import { useState } from "react";
import type { PreviewerProps } from "./types";

export function ImagePreviewer({ fileUrl, fileName }: PreviewerProps) {
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);

	return (
		<div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
			{loading && (
				<div
					style={{
						width: "100%",
						height: 256,
						background: "var(--bg-tertiary)",
						borderRadius: "var(--radius-md)",
						animation: "pulse 1.5s ease-in-out infinite",
					}}
				/>
			)}
			{error && <p style={{ color: "var(--accent-red)" }}>Failed to load image</p>}
			<img
				src={fileUrl}
				alt={fileName}
				style={{
					maxWidth: "100%",
					maxHeight: "70vh",
					objectFit: "contain",
					display: loading ? "none" : "block",
				}}
				onLoad={() => setLoading(false)}
				onError={() => {
					setLoading(false);
					setError(true);
				}}
			/>
		</div>
	);
}
