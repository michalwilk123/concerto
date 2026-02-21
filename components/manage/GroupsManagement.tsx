"use client";

import { Plus, Trash2, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { DataTableShell } from "@/components/ui/data-table-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { EntityGridRow } from "@/components/ui/entity-list-row";
import { InlineButton } from "@/components/ui/inline-button";
import { InlineErrorBanner } from "@/components/ui/inline-error-banner";
import { Modal } from "@/components/ui/modal";
import { TextInput } from "@/components/ui/text-input";
import { Typography } from "@/components/ui/typography";
import { groupsApi } from "@/lib/api-client";
import type { Group } from "@/types/group";
import { GroupMemberManager } from "./GroupMemberManager";

function formatDate(dateStr: string) {
	return new Date(dateStr).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

interface GroupsManagementProps {
	isAdmin: boolean;
}

export function GroupsManagement({ isAdmin }: GroupsManagementProps) {
	const [groups, setGroups] = useState<(Group & { memberCount?: number })[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [createOpen, setCreateOpen] = useState(false);
	const [createName, setCreateName] = useState("");
	const [createLoading, setCreateLoading] = useState(false);

	const [deleteGroup, setDeleteGroup] = useState<Group | null>(null);
	const [deleteLoading, setDeleteLoading] = useState(false);

	const [managingGroup, setManagingGroup] = useState<Group | null>(null);

	const fetchGroups = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const gs = await groupsApi.list();
			const withCounts = await Promise.all(
				gs.map(async (g) => {
					try {
						const members = await groupsApi.getMembers(g.id);
						return { ...g, memberCount: members.length };
					} catch {
						return { ...g, memberCount: 0 };
					}
				}),
			);
			setGroups(withCounts);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Failed to load groups");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchGroups();
	}, [fetchGroups]);

	const handleCreate = async () => {
		if (!createName.trim()) return;
		setCreateLoading(true);
		try {
			await groupsApi.create({ name: createName.trim() });
			setCreateOpen(false);
			setCreateName("");
			fetchGroups();
		} catch (e) {
			setError(e instanceof Error ? e.message : "Failed to create group");
		} finally {
			setCreateLoading(false);
		}
	};

	const handleDelete = async () => {
		if (!deleteGroup) return;
		setDeleteLoading(true);
		try {
			await groupsApi.delete(deleteGroup.id);
			setDeleteGroup(null);
			fetchGroups();
		} catch (e) {
			setError(e instanceof Error ? e.message : "Failed to delete group");
		} finally {
			setDeleteLoading(false);
		}
	};

	if (managingGroup) {
		return (
			<GroupMemberManager
				group={managingGroup}
				onBack={() => {
					setManagingGroup(null);
					fetchGroups();
				}}
			/>
		);
	}

	return (
		<>
			{/* Toolbar */}
			{isAdmin && (
				<div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
					<InlineButton variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
						<Plus size={15} style={{ marginRight: 4 }} />
						Create Group
					</InlineButton>
				</div>
			)}

			{error && <InlineErrorBanner message={error} onDismiss={() => setError(null)} />}

			{/* Table */}
			<DataTableShell
				headers={["Name", "Members", "Created", "Actions"]}
				columns="2fr 1fr 1fr 120px"
				isLoading={loading}
				hasRows={groups.length > 0}
				emptyState={
					<EmptyState
						icon={<Users size={32} />}
						title="No groups yet"
						subtitle={undefined}
						padding="48px 20px"
					/>
				}
			>
				{groups.map((g, i) => (
					<EntityGridRow key={g.id} columns="2fr 1fr 1fr 120px" isLast={i === groups.length - 1}>
						<Typography variant="bodySm" weight={500}>
							{g.name}
						</Typography>
						<Typography variant="caption" tone="secondary">
							{g.memberCount ?? "—"}
						</Typography>
						<Typography variant="meta" tone="tertiary">
							{formatDate(g.createdAt)}
						</Typography>
						<div style={{ display: "flex", gap: 4 }}>
							<InlineButton
								variant="ghost"
								size="xs"
								onClick={() => setManagingGroup(g)}
								title="Manage members"
								style={{ padding: "4px 8px", fontSize: "0.76rem" }}
							>
								<Users size={14} style={{ marginRight: 4 }} />
								Manage
							</InlineButton>
							{isAdmin && (
								<InlineButton
									variant="ghost"
									size="xs"
									onClick={() => setDeleteGroup(g)}
									title="Delete group"
									style={{ padding: "4px 6px", color: "var(--text-tertiary)" }}
								>
									<Trash2 size={14} />
								</InlineButton>
							)}
						</div>
					</EntityGridRow>
				))}
			</DataTableShell>

			{/* Create Modal */}
			<Modal open={createOpen} onClose={() => setCreateOpen(false)} maxWidth={400}>
				<div style={{ padding: 24 }}>
					<Typography as="h2" variant="titleMd" style={{ margin: "0 0 20px 0" }}>
						Create Group
					</Typography>
					<label
						htmlFor="create-group-name"
						style={{
							display: "block",
							fontSize: "0.76rem",
							fontWeight: 600,
							color: "var(--text-secondary)",
							marginBottom: 6,
							textTransform: "uppercase",
							letterSpacing: "0.04em",
						}}
					>
						<Typography as="span" variant="label" tone="secondary">
							Group Name
						</Typography>
					</label>
					<TextInput
						id="create-group-name"
						value={createName}
						onChange={(e) => setCreateName(e.target.value)}
						placeholder="e.g. Piano Class 2026"
						style={{ width: "100%", marginBottom: 20, fontSize: "0.84rem" }}
						onKeyDown={(e) => e.key === "Enter" && handleCreate()}
					/>
					<div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
						<InlineButton variant="secondary" size="sm" onClick={() => setCreateOpen(false)}>
							Cancel
						</InlineButton>
						<InlineButton
							variant="primary"
							size="sm"
							onClick={handleCreate}
							loading={createLoading}
							disabled={!createName.trim()}
						>
							Create
						</InlineButton>
					</div>
				</div>
			</Modal>

			{/* Delete Modal */}
			<Modal open={!!deleteGroup} onClose={() => setDeleteGroup(null)} maxWidth={400}>
				{deleteGroup && (
					<div style={{ padding: 24 }}>
						<Typography as="h2" variant="titleMd" style={{ margin: "0 0 8px 0" }}>
							Delete Group
						</Typography>
						<Typography as="p" variant="bodySm" tone="secondary" style={{ margin: "0 0 8px 0" }}>
							Are you sure you want to delete <strong>{deleteGroup.name}</strong>?
						</Typography>
						<Typography
							as="p"
							variant="meta"
							tone="tertiary"
							style={{
								margin: "0 0 24px 0",
								padding: "8px 12px",
								background: "rgba(239,68,68,0.06)",
								borderRadius: "var(--radius-sm)",
								border: "1px solid rgba(239,68,68,0.12)",
							}}
						>
							This will remove the group and all member associations.
						</Typography>
						<div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
							<InlineButton variant="secondary" size="sm" onClick={() => setDeleteGroup(null)}>
								Cancel
							</InlineButton>
							<InlineButton
								variant="danger"
								size="sm"
								onClick={handleDelete}
								loading={deleteLoading}
							>
								Delete Group
							</InlineButton>
						</div>
					</div>
				)}
			</Modal>
		</>
	);
}
