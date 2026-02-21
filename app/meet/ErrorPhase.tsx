import { AppHeader } from "@/components/AppHeader";
import { InlineButton } from "@/components/ui/inline-button";

interface ErrorPhaseProps {
	message: string;
	onRetry: () => void;
	onBack: () => void;
}

export default function ErrorPhase({ message, onRetry, onBack }: ErrorPhaseProps) {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				minHeight: "100vh",
				background: "var(--bg-primary)",
			}}
		>
			<AppHeader mode="app" />
			<div
				style={{
					flex: 1,
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
				}}
			>
				<div
					style={{
						background: "var(--bg-secondary)",
						padding: "var(--space-2xl)",
						borderRadius: "var(--radius-lg)",
						border: "1px solid var(--border-subtle)",
						textAlign: "center",
						maxWidth: 400,
						width: "100%",
					}}
				>
					<h2 style={{ margin: "0 0 var(--space-md)", color: "var(--accent-red)" }}>Error</h2>
					<p
						style={{
							color: "var(--text-secondary)",
							margin: "0 0 var(--space-xl)",
							fontSize: "0.9rem",
						}}
					>
						{message}
					</p>
					<div style={{ display: "flex", gap: "var(--space-sm)", justifyContent: "center" }}>
						<InlineButton
							variant="primary"
							size="sm"
							onClick={onRetry}
							style={{ padding: "var(--space-sm) var(--space-xl)" }}
						>
							Try Again
						</InlineButton>
						<InlineButton
							variant="secondary"
							size="sm"
							onClick={onBack}
							style={{ padding: "var(--space-sm) var(--space-xl)" }}
						>
							Back to Dashboard
						</InlineButton>
					</div>
				</div>
			</div>
		</div>
	);
}
