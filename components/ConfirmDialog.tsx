"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect, useRef } from "react";
import { InlineButton } from "@/components/ui/inline-button";
import { Modal } from "@/components/ui/modal";
import { useTranslation } from "@/hooks/useTranslation";

interface ConfirmDialogProps {
	open: boolean;
	title: string;
	message: string;
	confirmLabel?: string;
	cancelLabel?: string;
	variant?: "danger" | "warning";
	onConfirm: () => void;
	onCancel: () => void;
}

export default function ConfirmDialog({
	open,
	title,
	message,
	confirmLabel,
	cancelLabel,
	variant = "danger",
	onConfirm,
	onCancel,
}: ConfirmDialogProps) {
	const { t } = useTranslation();
	const actionsRef = useRef<HTMLDivElement>(null);
	const resolvedConfirmLabel = confirmLabel ?? t("confirmDialog.confirm");
	const resolvedCancelLabel = cancelLabel ?? t("confirmDialog.cancel");

	useEffect(() => {
		if (!open) return;

		const timer = setTimeout(() => {
			actionsRef.current?.querySelector<HTMLButtonElement>("button:last-child")?.focus();
		}, 80);

		return () => clearTimeout(timer);
	}, [open]);

	const accentColor = variant === "danger" ? "var(--accent-red)" : "var(--accent-orange)";
	const accentBg = variant === "danger" ? "rgba(244, 67, 54, 0.10)" : "rgba(255, 152, 0, 0.10)";

	return (
		<Modal open={open} onClose={onCancel} maxWidth={380}>
			<div
				style={{
					padding: "var(--space-xl) var(--space-xl) var(--space-lg)",
					display: "flex",
					gap: "var(--space-lg)",
					alignItems: "flex-start",
				}}
			>
				<div
					style={{
						width: 40,
						height: 40,
						borderRadius: "var(--radius-md)",
						background: accentBg,
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						flexShrink: 0,
					}}
				>
					<AlertTriangle size={20} style={{ color: accentColor }} />
				</div>
				<div style={{ flex: 1, minWidth: 0 }}>
					<h3
						style={{
							margin: 0,
							fontSize: "0.95rem",
							fontWeight: 600,
							color: "var(--text-primary)",
							letterSpacing: "-0.01em",
						}}
					>
						{title}
					</h3>
					<p
						style={{
							margin: "var(--space-sm) 0 0",
							fontSize: "0.84rem",
							color: "var(--text-secondary)",
							lineHeight: 1.5,
						}}
					>
						{message}
					</p>
				</div>
			</div>

			<div
				ref={actionsRef}
				style={{
					padding: "var(--space-md) var(--space-xl) var(--space-xl)",
					display: "flex",
					gap: "var(--space-sm)",
					justifyContent: "flex-end",
				}}
			>
				<InlineButton
					variant="secondary"
					size="md"
					onClick={onCancel}
					style={{ padding: "var(--space-sm) var(--space-lg)" }}
				>
					{resolvedCancelLabel}
				</InlineButton>
				<InlineButton
					variant={variant}
					size="md"
					onClick={onConfirm}
					style={{
						padding: "var(--space-sm) var(--space-lg)",
						fontWeight: 600,
						letterSpacing: "-0.005em",
					}}
				>
					{resolvedConfirmLabel}
				</InlineButton>
			</div>
		</Modal>
	);
}
