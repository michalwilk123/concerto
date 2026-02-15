import type { ButtonHTMLAttributes, ReactNode } from "react";

const sizeMap: Record<string, number> = {
	xs: 24,
	sm: 28,
	md: 32,
	lg: 48,
};

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: "circle" | "square";
	size?: "xs" | "sm" | "md" | "lg";
	color?: string;
	children: ReactNode;
}

export function IconButton({
	variant = "circle",
	size = "md",
	color,
	children,
	style,
	...rest
}: IconButtonProps) {
	const dim = sizeMap[size];
	return (
		<button
			style={{
				width: dim,
				height: dim,
				borderRadius: variant === "circle" ? "50%" : "var(--radius-sm)",
				border: "none",
				background: color ?? "transparent",
				color: color ? "white" : "var(--text-tertiary)",
				cursor: "pointer",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				padding: 0,
				flexShrink: 0,
				...style,
			}}
			{...rest}
		>
			{children}
		</button>
	);
}
