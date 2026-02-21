"use client";

import type { CSSProperties, Ref, SelectHTMLAttributes } from "react";

const variantStyles: Record<string, CSSProperties> = {
	default: {
		padding: "10px 12px",
		borderRadius: "var(--radius-md)",
		background: "var(--bg-tertiary)",
		color: "var(--text-primary)",
		border: "1px solid var(--border-default)",
		fontSize: "0.84rem",
		cursor: "pointer",
	},
	compact: {
		padding: "8px 10px",
		borderRadius: "var(--radius-sm)",
		background: "var(--bg-tertiary)",
		color: "var(--text-primary)",
		border: "1px solid var(--border-default)",
		fontSize: "0.8rem",
		cursor: "pointer",
	},
};

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
	variant?: "default" | "compact";
	ref?: Ref<HTMLSelectElement>;
}

export function Select({ variant = "default", style, ref, ...rest }: SelectProps) {
	return (
		<select
			ref={ref}
			style={{
				...variantStyles[variant],
				...style,
			}}
			{...rest}
		/>
	);
}
