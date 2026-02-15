"use client";

import { useEffect, useState } from "react";
import type { PreviewerProps } from "./types";

export function TextPreviewer({ fileUrl }: PreviewerProps) {
	const [content, setContent] = useState("");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(false);

	useEffect(() => {
		setLoading(true);
		setError(false);
		fetch(fileUrl)
			.then((res) => res.text())
			.then((text) => {
				setContent(text);
				setLoading(false);
			})
			.catch(() => {
				setError(true);
				setLoading(false);
			});
	}, [fileUrl]);

	if (loading) return <p style={{ color: "var(--text-secondary)" }}>Loading...</p>;
	if (error) return <p style={{ color: "var(--accent-red)" }}>Failed to load file content</p>;

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
