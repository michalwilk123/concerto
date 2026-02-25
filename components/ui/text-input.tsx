import type { InputHTMLAttributes, Ref } from "react";

const variantStyles: Record<string, React.CSSProperties> = {
	default: {
		padding: "10px 12px",
		borderRadius: "var(--radius-md)",
		background: "var(--bg-tertiary)",
		color: "var(--text-primary)",
		border: "1px solid var(--border-default)",
		fontSize: "0.875rem",
	},
	inline: {
		flex: 1,
		padding: "2px 6px",
		background: "var(--bg-primary)",
		border: "1px solid var(--border-default)",
		borderRadius: "var(--radius-sm)",
		color: "var(--text-primary)",
		fontSize: "0.8rem",
		outline: "none",
		minWidth: 0,
	},
	transparent: {
		background: "transparent",
		border: "none",
		padding: 0,
		color: "var(--text-secondary)",
		outline: "none",
	},
};

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
	variant?: "default" | "inline" | "transparent";
	ref?: Ref<HTMLInputElement>;
}

export function TextInput({ variant = "default", style, ref, ...rest }: TextInputProps) {
	return (
		<input
			ref={ref}
			style={{
				...variantStyles[variant],
				...style,
			}}
			{...rest}
		/>
	);
}
