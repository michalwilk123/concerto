"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

const variantStyles: Record<string, React.CSSProperties> = {
	primary: { background: "var(--accent-blue)", color: "white", border: "none" },
	success: { background: "var(--accent-green)", color: "white", border: "none" },
	danger: { background: "var(--accent-red)", color: "white", border: "none" },
	warning: { background: "var(--accent-orange)", color: "white", border: "none" },
	accent: { background: "var(--accent-purple)", color: "white", border: "none" },
	secondary: {
		background: "var(--bg-tertiary)",
		color: "var(--text-primary)",
		border: "1px solid var(--border-default)",
	},
	ghost: { background: "transparent", color: "var(--text-primary)", border: "none" },
};

const sizeStyles: Record<string, React.CSSProperties> = {
	xs: { padding: "4px 8px", fontSize: "0.75rem" },
	sm: { padding: "var(--space-sm)", fontSize: "0.8rem" },
	md: { padding: "8px 16px", fontSize: "0.84rem" },
	lg: { padding: "var(--space-md) var(--space-xl)", fontSize: "0.9rem" },
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: "primary" | "success" | "danger" | "warning" | "accent" | "secondary" | "ghost";
	size?: "xs" | "sm" | "md" | "lg";
	fullWidth?: boolean;
	loading?: boolean;
	children: ReactNode;
}

export function InlineButton({
	variant = "secondary",
	size = "md",
	fullWidth = false,
	loading = false,
	children,
	style,
	disabled,
	...rest
}: ButtonProps) {
	return (
		<button
			disabled={disabled || loading}
			style={{
				borderRadius: "var(--radius-md)",
				cursor: "pointer",
				fontWeight: 500,
				...variantStyles[variant],
				...sizeStyles[size],
				...(fullWidth ? { width: "100%" } : undefined),
				...(loading ? { opacity: 0.7 } : undefined),
				...style,
			}}
			{...rest}
		>
			{children}
		</button>
	);
}
