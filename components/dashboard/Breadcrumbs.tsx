"use client";

import { ChevronRight, Home } from "lucide-react";
import type { FolderDoc } from "@/types/files";

interface BreadcrumbsProps {
	currentFolder: FolderDoc | null;
	onNavigate: (id: string | null) => void;
}

export function Breadcrumbs({ currentFolder, onNavigate }: BreadcrumbsProps) {
	return (
		<div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.875rem" }}>
			<button
				onClick={() => onNavigate(null)}
				style={{
					display: "flex",
					alignItems: "center",
					gap: 4,
					background: "none",
					border: "none",
					padding: "4px 8px",
					color: currentFolder ? "var(--text-secondary)" : "var(--text-primary)",
					cursor: "pointer",
					borderRadius: "var(--radius-sm)",
					fontWeight: 500,
				}}
			>
				<Home size={16} />
				<span>My Files</span>
			</button>
			{currentFolder && (
				<>
					<ChevronRight size={16} style={{ color: "var(--text-tertiary)" }} />
					<span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
						{currentFolder.name}
					</span>
				</>
			)}
		</div>
	);
}
