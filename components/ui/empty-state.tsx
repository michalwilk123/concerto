"use client";

import type { CSSProperties, ReactNode } from "react";
import { Typography } from "@/components/ui/typography";

interface EmptyStateProps {
	icon?: ReactNode;
	title: string;
	subtitle?: string;
	padding?: CSSProperties["padding"];
}

export function EmptyState({ icon, title, subtitle, padding = 64 }: EmptyStateProps) {
	return (
		<div style={{ textAlign: "center", padding, color: "var(--text-tertiary)" }}>
			{icon ? <div style={{ marginBottom: 16, opacity: 0.4 }}>{icon}</div> : null}
			<Typography as="p" variant="body" weight={500} tone="primary" style={{ margin: 0 }}>
				{title}
			</Typography>
			{subtitle ? (
				<Typography as="p" variant="bodySm" tone="tertiary" style={{ marginTop: 8 }}>
					{subtitle}
				</Typography>
			) : null}
		</div>
	);
}
