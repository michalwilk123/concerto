"use client";

import { ArrowLeft, Plus, Trash2, Users } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { DataTableShell } from "@/components/ui/data-table-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { EntityGridRow } from "@/components/ui/entity-list-row";
import { InlineButton } from "@/components/ui/inline-button";
import { InlineErrorBanner } from "@/components/ui/inline-error-banner";
import { Select } from "@/components/ui/select";
import Spinner from "@/components/ui/spinner";
import { TextInput } from "@/components/ui/text-input";
import { Typography } from "@/components/ui/typography";
import { useTranslation } from "@/hooks/useTranslation";
import { groupsApi, usersApi } from "@/lib/api-client";
import type { Group, GroupMember } from "@/types/group";

const ROLE_COLORS: Record<string, string> = {
	teacher: "linear-gradient(135deg, #22c55e, #16a34a)",
	student: "linear-gradient(135deg, #a78bfa, #7c3aed)",
};

type MemberWithInfo = GroupMember & { userName: string; userEmail: string };

interface GroupMemberManagerProps {
	group: Group;
	onBack: () => void;
}

export function GroupMemberManager({ group, onBack }: GroupMemberManagerProps) {
	const { t } = useTranslation();
	const [members, setMembers] = useState<MemberWithInfo[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Add member state
	const [search, setSearch] = useState("");
	const [searchResults, setSearchResults] = useState<{ id: string; name: string; email: string }[]>(
		[],
	);
	const [searching, setSearching] = useState(false);
	const [addRole, setAddRole] = useState<"teacher" | "student">("student");
	const [addingUserId, setAddingUserId] = useState<string | null>(null);
	const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

	const fetchMembers = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const m = await groupsApi.getMembers(group.id);
			setMembers(m);
		} catch (e) {
			setError(e instanceof Error ? e.message : t("groupMembers.loadFailed"));
		} finally {
			setLoading(false);
		}
	}, [group.id, t]);

	useEffect(() => {
		fetchMembers();
	}, [fetchMembers]);

	// Debounced user search
	useEffect(() => {
		if (!search.trim()) {
			setSearchResults([]);
			return;
		}
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(async () => {
			setSearching(true);
			try {
				const results = await usersApi.search(search.trim());
				const memberIds = new Set(members.map((m) => m.userId));
				setSearchResults(results.filter((u) => !memberIds.has(u.id)));
			} catch {
				// ignore search errors
			} finally {
				setSearching(false);
			}
		}, 300);
		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	}, [search, members]);

	const handleAddMember = async (userId: string) => {
		setAddingUserId(userId);
		try {
			await groupsApi.addMember(group.id, { userId, role: addRole });
			setSearch("");
			setSearchResults([]);
			fetchMembers();
		} catch (e) {
			setError(e instanceof Error ? e.message : t("groupMembers.addFailed"));
		} finally {
			setAddingUserId(null);
		}
	};

	const handleRemoveMember = async (userId: string) => {
		try {
			await groupsApi.removeMember(group.id, userId);
			fetchMembers();
		} catch (e) {
			setError(e instanceof Error ? e.message : t("groupMembers.removeFailed"));
		}
	};

	return (
		<div>
			{/* Header */}
			<div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
				<InlineButton variant="ghost" size="sm" onClick={onBack}>
					<ArrowLeft size={16} />
				</InlineButton>
				<Typography as="h2" variant="titleMd" style={{ margin: 0 }}>
					{group.name}
				</Typography>
				<Typography as="span" variant="caption" tone="tertiary">
					{t("groupMembers.membersSuffix")}
				</Typography>
			</div>

			{error && <InlineErrorBanner message={error} onDismiss={() => setError(null)} />}

			{/* Add Member */}
			<div
				style={{
					marginBottom: 20,
					padding: 16,
					background: "var(--bg-tertiary)",
					borderRadius: "var(--radius-lg)",
					border: "1px solid var(--border-subtle)",
				}}
			>
				<Typography
					as="span"
					variant="label"
					tone="secondary"
					style={{ display: "block", marginBottom: 10 }}
				>
					{t("groupMembers.addMember")}
				</Typography>
				<div style={{ display: "flex", gap: 8, alignItems: "center" }}>
					<div style={{ position: "relative", flex: 1 }}>
						<TextInput
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder={t("groupMembers.searchPlaceholder")}
							style={{ width: "100%", fontSize: "0.84rem" }}
						/>
						{/* Dropdown */}
						{(searchResults.length > 0 || searching) && search.trim() && (
							<div
								style={{
									position: "absolute",
									top: "100%",
									left: 0,
									right: 0,
									marginTop: 4,
									background: "var(--bg-secondary)",
									border: "1px solid var(--border-default)",
									borderRadius: "var(--radius-md)",
									boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
									zIndex: 100,
									maxHeight: 200,
									overflowY: "auto",
								}}
							>
								{searching ? (
									<div style={{ padding: 12, textAlign: "center" }}>
										<Spinner size={16} />
									</div>
								) : (
									searchResults.map((u) => (
										<div
											key={u.id}
											style={{
												display: "flex",
												alignItems: "center",
												justifyContent: "space-between",
												padding: "8px 12px",
												borderBottom: "1px solid var(--border-subtle)",
												cursor: "pointer",
											}}
										>
											<div>
												<Typography as="span" variant="bodySm" weight={500}>
													{u.name}
												</Typography>
												<Typography
													as="span"
													variant="meta"
													tone="tertiary"
													style={{ marginLeft: 8 }}
												>
													{u.email}
												</Typography>
											</div>
											<InlineButton
												variant="ghost"
												size="xs"
												onClick={() => handleAddMember(u.id)}
												loading={addingUserId === u.id}
												style={{ padding: "4px 8px" }}
											>
												<Plus size={14} style={{ marginRight: 2 }} />
												{t("groupMembers.add")}
											</InlineButton>
										</div>
									))
								)}
							</div>
						)}
					</div>
					<Select
						value={addRole}
						onChange={(e) => setAddRole(e.target.value as "teacher" | "student")}
						style={{ background: "var(--bg-secondary)" }}
					>
						<option value="student">{t("groupMembers.student")}</option>
						<option value="teacher">{t("groupMembers.teacher")}</option>
					</Select>
				</div>
			</div>

			{/* Members Table */}
			<DataTableShell
				headers={[t("groupMembers.tableName"), t("groupMembers.tableEmail"), t("groupMembers.tableRole"), ""]}
				columns="2fr 2.5fr 100px 60px"
				isLoading={loading}
				hasRows={members.length > 0}
				emptyState={
					<EmptyState
						icon={<Users size={32} />}
						title={t("groupMembers.emptyTitle")}
						subtitle={undefined}
						padding="48px 20px"
					/>
				}
			>
				{members.map((m, i) => (
					<EntityGridRow
						key={m.id}
						columns="2fr 2.5fr 100px 60px"
						isLast={i === members.length - 1}
					>
						<Typography variant="bodySm" weight={500}>
							{m.userName}
						</Typography>
						<Typography variant="caption" tone="secondary" truncate>
							{m.userEmail}
						</Typography>
						<div>
							<Badge label={m.role} color={ROLE_COLORS[m.role] || ROLE_COLORS.student} />
						</div>
						<div style={{ display: "flex", justifyContent: "flex-end" }}>
							<InlineButton
								variant="ghost"
								size="xs"
								onClick={() => handleRemoveMember(m.userId)}
								title={t("groupMembers.removeMember")}
								style={{ padding: "4px 6px", color: "var(--text-tertiary)" }}
							>
								<Trash2 size={14} />
							</InlineButton>
						</div>
					</EntityGridRow>
				))}
			</DataTableShell>
		</div>
	);
}
