"use client";

import { Film, FolderOpen, HardDrive, Languages, Music, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Select } from "@/components/ui/select";
import { groupsApi } from "@/lib/api-client";
import { useSession } from "@/lib/auth-client";
import { buildDashboardUrl, type DashboardTab } from "@/lib/dashboard-url";
import { useFileManagerStore } from "@/stores/file-manager-store";
import { useTranslation } from "@/hooks/useTranslation";
import type { Group } from "@/types/group";

interface DashboardSidebarProps {
	meetingsFolderName: string | null;
	groupId: string;
	activeTab?: DashboardTab;
}

export function DashboardSidebar({
	meetingsFolderName: _meetingsFolderName,
	groupId,
	activeTab,
}: DashboardSidebarProps) {
	const router = useRouter();
	const { data: session } = useSession();
	const isPrivileged = session?.user?.role === "teacher" || session?.user?.role === "admin";
	const isAdmin = session?.user?.role === "admin";
	const { storageUsed, fetchStorage } = useFileManagerStore();
	const [groups, setGroups] = useState<Group[]>([]);
	const { t } = useTranslation();

	useEffect(() => {
		fetchStorage();
	}, [fetchStorage]);

	useEffect(() => {
		if (!isAdmin) return;
		groupsApi
			.list()
			.then(setGroups)
			.catch(() => {});
	}, [isAdmin]);

	const activeItem = activeTab || "files";

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
				{isAdmin && groups.length > 1 && (
					<div style={{ padding: "0 4px", marginBottom: 12 }}>
						<Select
							value={groupId}
							onChange={(e) => router.push(buildDashboardUrl(e.target.value))}
							variant="compact"
						>
							{groups.map((g) => (
								<option key={g.id} value={g.id}>
									{g.name}
								</option>
							))}
						</Select>
					</div>
				)}
				<SidebarButton
					icon={<FolderOpen size={18} />}
					label={t("sidebar.myFiles")}
					active={activeItem === "files"}
					onClick={() => router.push(buildDashboardUrl(groupId))}
				/>
				{isPrivileged && (
					<SidebarButton
						icon={<Music size={18} />}
						label={t("sidebar.meetings")}
						active={activeItem === "meetings"}
						onClick={() => router.push(buildDashboardUrl(groupId, { tab: "meetings" }))}
					/>
				)}
				<SidebarButton
					icon={<Film size={18} />}
					label={t("sidebar.recordings")}
					active={activeItem === "recordings"}
					onClick={() => router.push(buildDashboardUrl(groupId, { tab: "recordings" }))}
				/>
				{isPrivileged && (
					<SidebarButton
						icon={<Settings size={18} />}
						label={t("sidebar.manage")}
						active={activeItem === "manage"}
						onClick={() => router.push(buildDashboardUrl(groupId, { tab: "manage" }))}
					/>
				)}
				{isAdmin && (
					<SidebarButton
						icon={<Languages size={18} />}
						label={t("sidebar.translations")}
						active={activeItem === "translations"}
						onClick={() => router.push(buildDashboardUrl(groupId, { tab: "translations" }))}
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
							{t("sidebar.storage")}
						</span>
					</div>
					<ProgressBar value={usedPercentage / 100} color="var(--accent-purple)" height={4} />
					<p style={{ fontSize: "0.7rem", color: "var(--text-tertiary)", marginTop: 4 }}>
						{t("sidebar.storageUsed", {
							used: formatSize(storageUsed),
							limit: formatSize(storageLimit),
						})}
					</p>
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
			type="button"
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
