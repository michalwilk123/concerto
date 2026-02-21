"use client";

import { Film, FolderOpen, HardDrive, Music, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Select } from "@/components/ui/select";
import { TextInput } from "@/components/ui/text-input";
import { useSession } from "@/lib/auth-client";
import { buildDashboardUrl, type DashboardTab } from "@/lib/dashboard-url";
import { groupsApi } from "@/lib/api-client";
import { useFileManagerStore } from "@/stores/file-manager-store";
import type { Group } from "@/types/group";

interface DashboardSidebarProps {
	meetingsFolderName: string | null;
	groupId: string;
	activeTab?: DashboardTab;
}

type SidebarLocale = "en" | "pl";

const SIDEBAR_TRANSLATIONS_STORAGE_KEY = "dashboard-sidebar-translations-v1";

const defaultSidebarLabels: Record<SidebarLocale, { myFiles: string }> = {
	en: { myFiles: "My Files" },
	pl: { myFiles: "Moje pliki" },
};

function getDefaultMyFilesLabel(locale: SidebarLocale): string {
	return defaultSidebarLabels[locale].myFiles;
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
	const [locale, setLocale] = useState<SidebarLocale>("en");
	const [myFilesTranslations, setMyFilesTranslations] = useState<Record<SidebarLocale, string>>({
		en: getDefaultMyFilesLabel("en"),
		pl: getDefaultMyFilesLabel("pl"),
	});

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

	useEffect(() => {
		const raw = localStorage.getItem(SIDEBAR_TRANSLATIONS_STORAGE_KEY);
		if (!raw) return;
		try {
			const parsed = JSON.parse(raw) as Partial<Record<SidebarLocale, string>> & {
				locale?: SidebarLocale;
			};
			setMyFilesTranslations({
				en: parsed.en ?? getDefaultMyFilesLabel("en"),
				pl: parsed.pl ?? getDefaultMyFilesLabel("pl"),
			});
			if (parsed.locale === "en" || parsed.locale === "pl") {
				setLocale(parsed.locale);
			}
		} catch {
			localStorage.removeItem(SIDEBAR_TRANSLATIONS_STORAGE_KEY);
		}
	}, []);

	useEffect(() => {
		localStorage.setItem(
			SIDEBAR_TRANSLATIONS_STORAGE_KEY,
			JSON.stringify({
				locale,
				en: myFilesTranslations.en,
				pl: myFilesTranslations.pl,
			}),
		);
	}, [locale, myFilesTranslations]);

	const activeItem = activeTab || "files";

	const storageLimit = 1024 * 1024 * 1024; // 1GB
	const usedPercentage = Math.min((storageUsed / storageLimit) * 100, 100);
	const myFilesLabel = myFilesTranslations[locale] || getDefaultMyFilesLabel(locale);

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
					label={myFilesLabel}
					active={activeItem === "files"}
					onClick={() => router.push(buildDashboardUrl(groupId))}
				/>
				{isPrivileged && (
					<SidebarButton
						icon={<Music size={18} />}
						label="Meetings"
						active={activeItem === "meetings"}
						onClick={() => router.push(buildDashboardUrl(groupId, { tab: "meetings" }))}
					/>
				)}
				<SidebarButton
					icon={<Film size={18} />}
					label="Recordings"
					active={activeItem === "recordings"}
					onClick={() => router.push(buildDashboardUrl(groupId, { tab: "recordings" }))}
				/>
				{isPrivileged && (
					<SidebarButton
						icon={<Settings size={18} />}
						label="Manage"
						active={activeItem === "manage"}
						onClick={() => router.push(buildDashboardUrl(groupId, { tab: "manage" }))}
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
					style={{
						margin: "0 12px 16px",
						padding: "12px",
						border: "1px solid var(--border-subtle)",
						borderRadius: "var(--radius-md)",
						background: "var(--bg-primary)",
						display: "grid",
						gap: 8,
					}}
				>
					<span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: 600 }}>
						Translation experiment
					</span>
					<label
						htmlFor="sidebar-locale"
						style={{ fontSize: "0.7rem", color: "var(--text-tertiary)", fontWeight: 500 }}
					>
						Locale
					</label>
					<Select
						id="sidebar-locale"
						variant="compact"
						value={locale}
						onChange={(event) => setLocale(event.target.value as SidebarLocale)}
					>
						<option value="en">English (en)</option>
						<option value="pl">Polski (pl)</option>
					</Select>
					<label
						htmlFor="sidebar-my-files-translation"
						style={{ fontSize: "0.7rem", color: "var(--text-tertiary)", fontWeight: 500 }}
					>
						My Files label
					</label>
					<TextInput
						id="sidebar-my-files-translation"
						value={myFilesTranslations[locale]}
						onChange={(event) => {
							const value = event.target.value;
							setMyFilesTranslations((current) => ({
								...current,
								[locale]: value,
							}));
						}}
						placeholder={getDefaultMyFilesLabel(locale)}
						style={{ fontSize: "0.8rem", padding: "8px 10px" }}
					/>
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
