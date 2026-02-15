"use client";

import { Component, type ReactNode } from "react";

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
}

interface State {
	hasError: boolean;
	error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: any) {
		console.error("ErrorBoundary caught an error:", error, errorInfo);
	}

	render() {
		if (this.state.hasError) {
			return (
				this.props.fallback || (
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							justifyContent: "center",
							minHeight: "400px",
							padding: "var(--space-xl)",
							textAlign: "center",
						}}
					>
						<h2 style={{ color: "var(--accent-red)", marginBottom: "var(--space-md)" }}>
							Something went wrong
						</h2>
						<p style={{ color: "var(--text-secondary)", marginBottom: "var(--space-lg)" }}>
							{this.state.error?.message || "An unexpected error occurred"}
						</p>
						<button
							onClick={() => window.location.reload()}
							style={{
								padding: "var(--space-sm) var(--space-lg)",
								background: "var(--accent-blue)",
								color: "white",
								border: "none",
								borderRadius: "var(--radius-md)",
								cursor: "pointer",
							}}
						>
							Reload Page
						</button>
					</div>
				)
			);
		}

		return this.props.children;
	}
}
