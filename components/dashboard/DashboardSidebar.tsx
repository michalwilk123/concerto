"use client";

import { FolderOpen, HardDrive, Music, Radio } from "lucide-react";
import { useEffect, useState } from "react";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useFileManagerStore } from "@/stores/file-manager-store";

interface DashboardSidebarProps {
	meetingsFolderId: string | null;
}

export function DashboardSidebar({ meetingsFolderId }: DashboardSidebarProps) {
	const { currentFolderId, navigateToFolder, storageUsed, fetchStorage } = useFileManagerStore();
	const [activeItem, setActiveItem] = useState<"files" | "meetings">("files");

	useEffect(() => {
		fetchStorage();
	}, [fetchStorage]);

	useEffect(() => {
		if (currentFolderId === meetingsFolderId && meetingsFolderId) {
			setActiveItem("meetings");
		} else {
			setActiveItem("files");
		}
	}, [currentFolderId, meetingsFolderId]);

	const storageLimit = 1024 * 1024 * 1024; // 1GB
	const usedPercentage = Math.min((storageUsed / storageLimit) * 100, 100);

	const formatSize = (bytes: number): string => {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
		return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
	};

	return (
		<aside
			style={{
				width: 220,
				flexShrink: 0,
				background: "var(--bg-secondary)",
				borderRight: "1px solid var(--border-subtle)",
				display: "flex",
				flexDirection: "column",
				padding: "16px 0",
			}}
		>
			<nav style={{ flex: 1, padding: "0 8px" }}>
				<SidebarButton
					icon={<FolderOpen size={18} />}
					label="My Files"
					active={activeItem === "files"}
					onClick={() => {
						setActiveItem("files");
						navigateToFolder(null);
					}}
				/>
				{meetingsFolderId && (
					<SidebarButton
						icon={<Music size={18} />}
						label="Meetings"
						active={activeItem === "meetings"}
						onClick={() => {
							setActiveItem("meetings");
							navigateToFolder(meetingsFolderId);
						}}
					/>
				)}

				<div
					style={{
						margin: "24px 12px",
						padding: "16px 0",
						borderTop: "1px solid var(--border-subtle)",
					}}
				>
					<div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
						<HardDrive size={14} style={{ color: "var(--text-tertiary)" }} />
						<span style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--text-secondary)" }}>
							Storage
						</span>
					</div>
					<ProgressBar value={usedPercentage / 100} color="var(--accent-purple)" height={4} />
					<p style={{ fontSize: "0.7rem", color: "var(--text-tertiary)", marginTop: 4 }}>
						{formatSize(storageUsed)} of {formatSize(storageLimit)} used
					</p>
				</div>

				<div
					style={{ borderTop: "1px solid var(--border-subtle)", margin: "0 12px", paddingTop: 16 }}
				>
					<SidebarLink icon={<Radio size={18} />} label="Lobby" href="/lobby" />
				</div>
			</nav>
		</aside>
	);
}

function SidebarButton({
	icon,
	label,
	active,
	onClick,
}: {
	icon: React.ReactNode;
	label: string;
	active: boolean;
	onClick: () => void;
}) {
	return (
		<button
			onClick={onClick}
			style={{
				display: "flex",
				width: "100%",
				alignItems: "center",
				gap: 10,
				padding: "8px 12px",
				borderRadius: "var(--radius-md)",
				background: active ? "var(--bg-tertiary)" : "transparent",
				border: "none",
				color: active ? "var(--text-primary)" : "var(--text-secondary)",
				cursor: "pointer",
				fontSize: "0.84rem",
				fontWeight: 500,
				transition: "background 0.15s",
			}}
		>
			{icon}
			{label}
		</button>
	);
}

function SidebarLink({
	icon,
	label,
	href,
}: {
	icon: React.ReactNode;
	label: string;
	href: string;
}) {
	return (
		<a
			href={href}
			style={{
				display: "flex",
				alignItems: "center",
				gap: 10,
				padding: "8px 12px",
				borderRadius: "var(--radius-md)",
				color: "var(--text-secondary)",
				textDecoration: "none",
				fontSize: "0.84rem",
				fontWeight: 500,
				transition: "background 0.15s",
			}}
		>
			{icon}
			{label}
		</a>
	);
}
