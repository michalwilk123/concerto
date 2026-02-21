"use client";

import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import { buildDashboardUrl } from "@/lib/dashboard-url";
import type { FolderDoc } from "@/types/files";

interface BreadcrumbsProps {
	groupId: string;
	ancestors: FolderDoc[];
}

export function Breadcrumbs({ groupId, ancestors }: BreadcrumbsProps) {
	const isAtRoot = ancestors.length === 0;

	return (
		<div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.875rem" }}>
			<Link
				href={buildDashboardUrl(groupId)}
				style={{
					display: "flex",
					alignItems: "center",
					gap: 4,
					background: "none",
					border: "none",
					padding: "4px 8px",
					color: isAtRoot ? "var(--text-primary)" : "var(--text-secondary)",
					cursor: "pointer",
					borderRadius: "var(--radius-sm)",
					fontWeight: 500,
					textDecoration: "none",
				}}
			>
				<Home size={16} />
				<span>My Files</span>
			</Link>
			{ancestors.map((folder, index) => {
				const isLast = index === ancestors.length - 1;

				return (
					<span key={folder.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
						<ChevronRight size={16} style={{ color: "var(--text-tertiary)" }} />
						{isLast ? (
							<span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
								{folder.name}
							</span>
						) : (
							<Link
								href={buildDashboardUrl(groupId, { folderId: folder.id })}
								style={{
									color: "var(--text-secondary)",
									fontWeight: 500,
									textDecoration: "none",
									padding: "4px 8px",
									borderRadius: "var(--radius-sm)",
								}}
							>
								{folder.name}
							</Link>
						)}
					</span>
				);
			})}
		</div>
	);
}
