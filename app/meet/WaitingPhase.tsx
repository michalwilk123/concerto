import { AppHeader } from "@/components/AppHeader";
import { InlineButton } from "@/components/ui/inline-button";
import Spinner from "@/components/ui/spinner";

interface WaitingPhaseProps {
	roomKey: string;
	onCancel: () => void;
}

export default function WaitingPhase({ roomKey, onCancel }: WaitingPhaseProps) {
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
					<div
						style={{ marginBottom: "var(--space-xl)", display: "flex", justifyContent: "center" }}
					>
						<Spinner />
					</div>
					<h2 style={{ margin: "0 0 var(--space-md)" }}>Waiting for Approval</h2>
					<p
						style={{
							color: "var(--text-secondary)",
							margin: "0 0 var(--space-xl)",
							fontSize: "0.9rem",
						}}
					>
						A moderator will review your request to join{" "}
						<code style={{ color: "var(--text-primary)", fontFamily: "monospace" }}>{roomKey}</code>
					</p>
					<InlineButton
						variant="secondary"
						size="sm"
						onClick={onCancel}
						style={{ padding: "var(--space-sm) var(--space-xl)" }}
					>
						Cancel
					</InlineButton>
				</div>
			</div>
		</div>
	);
}
