"use client";

import { ArrowLeft } from "lucide-react";
import type { FormEvent } from "react";
import { AppHeader } from "@/components/AppHeader";
import { InlineButton } from "@/components/ui/inline-button";
import { useTranslation } from "@/hooks/useTranslation";

interface NameEntryPhaseProps {
	meetingId: string;
	participantName: string;
	onParticipantNameChange: (value: string) => void;
	onSubmit: (e: FormEvent) => void;
	onBack: () => void;
}

export default function NameEntryPhase({
	meetingId,
	participantName,
	onParticipantNameChange,
	onSubmit,
	onBack,
}: NameEntryPhaseProps) {
	const { t } = useTranslation();

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
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<div
					style={{
						background: "var(--bg-secondary)",
						borderRadius: "var(--radius-lg)",
						border: "1px solid var(--border-subtle)",
						padding: "var(--space-2xl)",
						width: "100%",
						maxWidth: 380,
					}}
				>
					<InlineButton
						variant="ghost"
						size="sm"
						onClick={onBack}
						style={{
							padding: 0,
							color: "var(--text-secondary)",
							display: "flex",
							alignItems: "center",
							gap: "var(--space-xs)",
							fontSize: "0.8rem",
							marginBottom: "var(--space-xl)",
						}}
					>
						<ArrowLeft size={14} />
						{t("room.nameEntry.backToDashboard")}
					</InlineButton>

					<h2 style={{ margin: "0 0 var(--space-sm)", fontSize: "1.25rem" }}>
						{t("room.nameEntry.title")}
					</h2>
					<p
						style={{
							margin: "0 0 var(--space-xl)",
							fontSize: "0.85rem",
							color: "var(--text-secondary)",
						}}
					>
						{t("room.nameEntry.meetingLabel")}{" "}
						<code
							style={{
								color: "var(--text-primary)",
								fontFamily: "monospace",
								letterSpacing: "0.05em",
							}}
						>
							{meetingId}
						</code>
					</p>

					<form
						onSubmit={onSubmit}
						style={{
							display: "flex",
							flexDirection: "column",
							gap: "var(--space-lg)",
						}}
					>
						<div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
							<label
								htmlFor="participantName"
								style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 500 }}
							>
								{t("room.nameEntry.yourName")}
							</label>
							<input
								id="participantName"
								type="text"
								value={participantName}
								onChange={(e) => onParticipantNameChange(e.target.value)}
								placeholder={t("room.nameEntry.namePlaceholder")}
								required
							/>
						</div>

						<InlineButton
							variant="primary"
							size="lg"
							type="submit"
							fullWidth
							style={{ fontWeight: 600, marginTop: "var(--space-sm)", padding: "var(--space-md)" }}
						>
							{t("room.nameEntry.submit")}
						</InlineButton>
					</form>
				</div>
			</div>
		</div>
	);
}
