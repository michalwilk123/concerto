"use client";

import { X } from "lucide-react";
import type { CSSProperties } from "react";
import { InlineButton } from "@/components/ui/inline-button";
import { Typography } from "@/components/ui/typography";

interface InlineErrorBannerProps {
	message: string;
	onDismiss?: () => void;
	style?: CSSProperties;
}

export function InlineErrorBanner({ message, onDismiss, style }: InlineErrorBannerProps) {
	return (
		<div
			style={{
				padding: "10px 14px",
				marginBottom: 16,
				background: "rgba(239,68,68,0.08)",
				border: "1px solid rgba(239,68,68,0.2)",
				borderRadius: "var(--radius-md)",
				color: "#f87171",
				fontSize: "0.82rem",
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
				...style,
			}}
		>
			<Typography variant="bodySm" style={{ color: "inherit" }}>
				{message}
			</Typography>
			{onDismiss ? (
				<InlineButton variant="ghost" size="xs" onClick={onDismiss}>
					<X size={14} />
				</InlineButton>
			) : null}
		</div>
	);
}
