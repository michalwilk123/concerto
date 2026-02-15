"use client";

import { FileText, X } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { Modal } from "@/components/ui/modal";
import { getPreviewerForMimeType } from "./PreviewRegistry";

interface FilePreviewModalProps {
	isOpen: boolean;
	onClose: () => void;
	fileName: string;
	fileUrl: string | null;
	mimeType: string;
}

export function FilePreviewModal({
	isOpen,
	onClose,
	fileName,
	fileUrl,
	mimeType,
}: FilePreviewModalProps) {
	const isVisible = isOpen && !!fileUrl;
	const PreviewerComponent = isVisible ? getPreviewerForMimeType(mimeType) : null;

	return (
		<Modal open={isVisible} onClose={onClose} maxWidth={1100}>
			<div
				style={{ maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						padding: "16px 20px",
						borderBottom: "1px solid var(--border-subtle)",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
						<FileText size={18} style={{ color: "var(--accent-purple)", flexShrink: 0 }} />
						<span
							style={{
								fontSize: "0.95rem",
								fontWeight: 600,
								color: "var(--text-primary)",
								overflow: "hidden",
								textOverflow: "ellipsis",
								whiteSpace: "nowrap",
							}}
						>
							{fileName}
						</span>
					</div>
					<IconButton
						onClick={onClose}
						variant="square"
						size="xs"
						style={{ color: "var(--text-secondary)" }}
					>
						<X size={20} />
					</IconButton>
				</div>
				<div style={{ flex: 1, overflow: "auto", padding: 16 }}>
					{PreviewerComponent && fileUrl && (
						<PreviewerComponent fileUrl={fileUrl} fileName={fileName} mimeType={mimeType} />
					)}
				</div>
			</div>
		</Modal>
	);
}
