"use client";

import type { CSSProperties, ReactNode } from "react";
import Spinner from "@/components/ui/spinner";

interface LoadingIndicatorProps {
	message?: string;
	size?: number;
	minHeight?: CSSProperties["minHeight"];
	padding?: CSSProperties["padding"];
	fullscreen?: boolean;
	containerStyle?: CSSProperties;
}

interface LoadingStateProps extends LoadingIndicatorProps {
	isLoading: boolean;
	children: ReactNode;
}

export function LoadingIndicator({
	message,
	size = 32,
	minHeight = 160,
	padding,
	fullscreen = false,
	containerStyle,
}: LoadingIndicatorProps) {
	return (
		<div
			style={{
				display: "flex",
				justifyContent: "center",
				alignItems: "center",
				flexDirection: "column",
				gap: 12,
				minHeight: fullscreen ? "100vh" : minHeight,
				padding,
				background: fullscreen ? "var(--bg-primary)" : undefined,
				color: "var(--text-secondary)",
				...containerStyle,
			}}
		>
			<Spinner size={size} />
			{message ? <p style={{ margin: 0, fontSize: "0.9rem" }}>{message}</p> : null}
		</div>
	);
}

export function LoadingState({ isLoading, children, ...props }: LoadingStateProps) {
	if (isLoading) {
		return <LoadingIndicator {...props} />;
	}
	return <>{children}</>;
}
