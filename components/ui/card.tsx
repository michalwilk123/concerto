"use client";

import { type HTMLAttributes, type ReactNode, useState } from "react";

const paddingMap: Record<string, number> = { sm: 8, md: 16, lg: 24 };

interface CardProps extends HTMLAttributes<HTMLDivElement> {
	hoverable?: boolean;
	interactive?: boolean;
	selected?: boolean;
	padding?: "sm" | "md" | "lg";
	children: ReactNode;
}

export function Card({
	hoverable = false,
	interactive = false,
	selected = false,
	padding = "md",
	children,
	style,
	...rest
}: CardProps) {
	const [hovered, setHovered] = useState(false);

	return (
		<div
			onMouseEnter={hoverable ? () => setHovered(true) : undefined}
			onMouseLeave={hoverable ? () => setHovered(false) : undefined}
			style={{
				background: hovered ? "var(--bg-elevated)" : "var(--bg-tertiary)",
				border: `1px solid ${hovered ? "var(--border-default)" : "var(--border-subtle)"}`,
				borderRadius: "var(--radius-lg)",
				padding: paddingMap[padding],
				transition: "background 0.15s, border-color 0.15s",
				cursor: interactive ? "pointer" : undefined,
				...style,
			}}
			{...rest}
		>
			{children}
		</div>
	);
}
