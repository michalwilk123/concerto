"use client";

import { Pencil, Search, Shield, Trash2, Users, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { GroupsManagement } from "@/components/manage/GroupsManagement";
import { Badge } from "@/components/ui/badge";
import { DataTableShell } from "@/components/ui/data-table-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { EntityGridRow } from "@/components/ui/entity-list-row";
import { InlineButton } from "@/components/ui/inline-button";
import { InlineErrorBanner } from "@/components/ui/inline-error-banner";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { TextInput } from "@/components/ui/text-input";
import { Typography } from "@/components/ui/typography";
import { useTranslation } from "@/hooks/useTranslation";
import { type AdminUser, adminApi, type UpdateUserParams } from "@/lib/api-client";
import { useSession } from "@/lib/auth-client";

const ROLE_COLORS: Record<string, string> = {
	admin: "linear-gradient(135deg, #f59e0b, #d97706)",
	teacher: "linear-gradient(135deg, #22c55e, #16a34a)",
	student: "linear-gradient(135deg, #a78bfa, #7c3aed)",
};

const STATUS_DOT = {
	active: "#22c55e",
	inactive: "#6b7280",
	banned: "#ef4444",
};

function formatDate(dateStr: string) {
	return new Date(dateStr).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

export function ManagePanel() {
	const { t } = useTranslation();
	const { data: session } = useSession();

	const isAdmin = session?.user?.role === "admin";

	const [users, setUsers] = useState<AdminUser[]>([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [limit] = useState(20);
	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [editUser, setEditUser] = useState<AdminUser | null>(null);
	const [editForm, setEditForm] = useState<UpdateUserParams>({});
	const [editSaving, setEditSaving] = useState(false);

	const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);
	const [deleteLoading, setDeleteLoading] = useState(false);

	const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

	const handleSearchChange = useCallback((value: string) => {
		setSearch(value);
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => {
			setDebouncedSearch(value);
			setPage(1);
		}, 300);
	}, []);

	const fetchUsers = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const res = await adminApi.listUsers({ page, limit, search: debouncedSearch || undefined });
			setUsers(res.users);
			setTotal(res.total);
		} catch (e) {
			setError(e instanceof Error ? e.message : t("manage.loadUsersFailed"));
		} finally {
			setLoading(false);
		}
	}, [page, limit, debouncedSearch, t]);

	useEffect(() => {
		if (isAdmin) fetchUsers();
	}, [fetchUsers, isAdmin]);

	const openEdit = (u: AdminUser) => {
		setEditUser(u);
		setEditForm({ role: u.role || "student", isActive: u.isActive, banned: u.banned || false });
	};

	const handleSaveEdit = async () => {
		if (!editUser) return;
		setEditSaving(true);
		try {
			await adminApi.updateUser(editUser.id, editForm);
			setEditUser(null);
			fetchUsers();
		} catch (e) {
			setError(e instanceof Error ? e.message : t("manage.updateUserFailed"));
		} finally {
			setEditSaving(false);
		}
	};

	const handleDelete = async () => {
		if (!deleteUser) return;
		setDeleteLoading(true);
		try {
			await adminApi.deleteUser(deleteUser.id);
			setDeleteUser(null);
			fetchUsers();
		} catch (e) {
			setError(e instanceof Error ? e.message : t("manage.deleteUserFailed"));
		} finally {
			setDeleteLoading(false);
		}
	};

	const totalPages = Math.ceil(total / limit);

	return (
		<div style={{ padding: "32px 40px" }}>
			{/* Groups Section */}
			<section>
				<div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
					<Shield size={18} style={{ color: "var(--text-tertiary)" }} />
					<Typography as="h2" variant="titleMd" style={{ margin: 0 }}>
						{t("manage.groupsTitle")}
					</Typography>
				</div>
				<GroupsManagement isAdmin={isAdmin} />
			</section>

			{/* Divider */}
			{isAdmin && (
				<div
					style={{
						height: 1,
						background: "var(--border-subtle)",
						margin: "40px 0",
					}}
				/>
			)}

			{/* Users Section (admin only) */}
			{isAdmin && (
				<section>
					<div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
						<Users size={18} style={{ color: "var(--text-tertiary)" }} />
						<Typography as="h2" variant="titleMd" style={{ margin: 0 }}>
							{t("manage.usersTitle")}
						</Typography>
						<Typography as="span" variant="meta" tone="tertiary" style={{ marginLeft: 4 }}>
							{t("manage.usersRegistered", { total: String(total) })}
						</Typography>
					</div>

					{/* Search toolbar */}
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 12,
							marginBottom: 20,
						}}
					>
						<div style={{ position: "relative", flex: 1, maxWidth: 360 }}>
							<Search
								size={15}
								style={{
									position: "absolute",
									left: 12,
									top: "50%",
									transform: "translateY(-50%)",
									color: "var(--text-tertiary)",
									pointerEvents: "none",
								}}
							/>
							<TextInput
								value={search}
								onChange={(e) => handleSearchChange(e.target.value)}
								placeholder={t("manage.searchPlaceholder")}
								style={{
									width: "100%",
									paddingLeft: 36,
									fontSize: "0.84rem",
								}}
							/>
						</div>
						{search && (
							<InlineButton
								variant="ghost"
								size="xs"
								onClick={() => {
									setSearch("");
									setDebouncedSearch("");
									setPage(1);
								}}
								style={{ color: "var(--text-tertiary)" }}
							>
								<X size={14} />
							</InlineButton>
						)}
					</div>

					{error && <InlineErrorBanner message={error} onDismiss={() => setError(null)} />}

					<DataTableShell
						headers={[
							t("manage.tableName"),
							t("manage.tableEmail"),
							t("manage.tableRole"),
							t("manage.tableStatus"),
							t("manage.tableCreated"),
							t("manage.tableActions"),
						]}
						columns="2fr 2.5fr 100px 110px 110px 90px"
						isLoading={loading}
						hasRows={users.length > 0}
						emptyState={
							<EmptyState
								icon={<Users size={32} />}
								title={debouncedSearch ? t("manage.noUsersMatch") : t("manage.noUsersFound")}
								subtitle={undefined}
								padding="48px 20px"
							/>
						}
					>
						{users.map((u, i) => (
							<EntityGridRow
								key={u.id}
								columns="2fr 2.5fr 100px 110px 110px 90px"
								isLast={i === users.length - 1}
							>
								<div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
									<div
										style={{
											width: 30,
											height: 30,
											borderRadius: "50%",
											background: u.image
												? `url(${u.image}) center/cover`
												: "linear-gradient(135deg, var(--bg-tertiary), var(--bg-elevated))",
											border: "1px solid var(--border-subtle)",
											flexShrink: 0,
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											fontSize: "0.72rem",
											fontWeight: 600,
											color: "var(--text-secondary)",
										}}
									>
										{!u.image && u.name.charAt(0).toUpperCase()}
									</div>
									<span
										style={{
											fontSize: "0.84rem",
											fontWeight: 500,
											color: "var(--text-primary)",
											overflow: "hidden",
											textOverflow: "ellipsis",
											whiteSpace: "nowrap",
										}}
									>
										{u.name}
									</span>
								</div>

								<span
									style={{
										fontSize: "0.8rem",
										color: "var(--text-secondary)",
										overflow: "hidden",
										textOverflow: "ellipsis",
										whiteSpace: "nowrap",
									}}
								>
									{u.email}
								</span>

								<div>
									<Badge
										label={u.role || "student"}
										color={ROLE_COLORS[u.role || "student"] || ROLE_COLORS.student}
									/>
								</div>

								<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
									<div
										style={{
											width: 7,
											height: 7,
											borderRadius: "50%",
											background: u.banned
												? STATUS_DOT.banned
												: u.isActive
													? STATUS_DOT.active
													: STATUS_DOT.inactive,
											boxShadow: u.banned
												? "0 0 6px rgba(239,68,68,0.4)"
												: u.isActive
													? "0 0 6px rgba(34,197,94,0.3)"
													: "none",
										}}
									/>
									<span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
										{u.banned
											? t("manage.statusBanned")
											: u.isActive
												? t("manage.statusActive")
												: t("manage.statusInactive")}
									</span>
								</div>

								<span style={{ fontSize: "0.78rem", color: "var(--text-tertiary)" }}>
									{formatDate(u.createdAt)}
								</span>

								<div style={{ display: "flex", gap: 4 }}>
									<InlineButton
										variant="ghost"
										size="xs"
										onClick={() => openEdit(u)}
										title={t("manage.editUserAction")}
										style={{ padding: "4px 6px", color: "var(--text-tertiary)" }}
									>
										<Pencil size={14} />
									</InlineButton>
									{session && u.id !== session.user.id && (
										<InlineButton
											variant="ghost"
											size="xs"
											onClick={() => setDeleteUser(u)}
											title={t("manage.deleteUserAction")}
											style={{ padding: "4px 6px", color: "var(--text-tertiary)" }}
										>
											<Trash2 size={14} />
										</InlineButton>
									)}
								</div>
							</EntityGridRow>
						))}
					</DataTableShell>

					{totalPages > 1 && (
						<div
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								marginTop: 16,
								padding: "0 4px",
							}}
						>
							<Typography as="span" variant="meta" tone="tertiary">
								{t("manage.pageOf", { page: String(page), total: String(totalPages) })}
							</Typography>
							<div style={{ display: "flex", gap: 6 }}>
								<InlineButton
									variant="secondary"
									size="xs"
									disabled={page <= 1}
									onClick={() => setPage((p) => p - 1)}
								>
									{t("manage.previous")}
								</InlineButton>
								<InlineButton
									variant="secondary"
									size="xs"
									disabled={page >= totalPages}
									onClick={() => setPage((p) => p + 1)}
								>
									{t("manage.next")}
								</InlineButton>
							</div>
						</div>
					)}

					{/* Edit Modal */}
					<Modal open={!!editUser} onClose={() => setEditUser(null)} maxWidth={420}>
						{editUser && (
							<div style={{ padding: 24 }}>
								<Typography as="h2" variant="titleMd" style={{ margin: "0 0 4px 0" }}>
									{t("manage.editUserTitle")}
								</Typography>
								<Typography
									as="p"
									variant="bodySm"
									tone="tertiary"
									style={{ margin: "0 0 24px 0" }}
								>
									{editUser.name} &middot; {editUser.email}
								</Typography>

								<label
									htmlFor="edit-user-role"
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
										{t("manage.roleLabel")}
									</Typography>
								</label>
								<Select
									id="edit-user-role"
									value={editForm.role || "student"}
									onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
									style={{
										width: "100%",
										marginBottom: 20,
									}}
								>
									<option value="admin">{t("manage.roleAdmin")}</option>
									<option value="teacher">{t("manage.roleTeacher")}</option>
									<option value="student">{t("manage.roleStudent")}</option>
								</Select>

								<div
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										marginBottom: 14,
									}}
								>
									<Typography as="span" variant="bodySm" tone="secondary">
										{t("manage.activeLabel")}
									</Typography>
									<ToggleSwitch
										checked={editForm.isActive ?? true}
										onChange={(v) => setEditForm((f) => ({ ...f, isActive: v }))}
									/>
								</div>

								<div
									style={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										marginBottom: 24,
									}}
								>
									<Typography as="span" variant="bodySm" tone="secondary">
										{t("manage.bannedLabel")}
									</Typography>
									<ToggleSwitch
										checked={editForm.banned ?? false}
										onChange={(v) => setEditForm((f) => ({ ...f, banned: v }))}
										color="#ef4444"
									/>
								</div>

								<div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
									<InlineButton variant="secondary" size="sm" onClick={() => setEditUser(null)}>
										{t("manage.cancel")}
									</InlineButton>
									<InlineButton
										variant="accent"
										size="sm"
										onClick={handleSaveEdit}
										loading={editSaving}
									>
										{t("manage.saveChanges")}
									</InlineButton>
								</div>
							</div>
						)}
					</Modal>

					{/* Delete Modal */}
					<Modal open={!!deleteUser} onClose={() => setDeleteUser(null)} maxWidth={400}>
						{deleteUser && (
							<div style={{ padding: 24 }}>
								<Typography as="h2" variant="titleMd" style={{ margin: "0 0 8px 0" }}>
									{t("manage.deleteUserTitle")}
								</Typography>
								<Typography
									as="p"
									variant="bodySm"
									tone="secondary"
									style={{ margin: "0 0 8px 0" }}
								>
									{t("manage.deleteUserMessage", { name: deleteUser.name })}
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
									{t("manage.deleteUserWarning")}
								</Typography>
								<div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
									<InlineButton variant="secondary" size="sm" onClick={() => setDeleteUser(null)}>
										{t("manage.cancel")}
									</InlineButton>
									<InlineButton
										variant="danger"
										size="sm"
										onClick={handleDelete}
										loading={deleteLoading}
									>
										{t("manage.deleteUserButton")}
									</InlineButton>
								</div>
							</div>
						)}
					</Modal>
				</section>
			)}
		</div>
	);
}

function ToggleSwitch({
	checked,
	onChange,
	color = "#22c55e",
}: {
	checked: boolean;
	onChange: (v: boolean) => void;
	color?: string;
}) {
	return (
		<button
			type="button"
			onClick={() => onChange(!checked)}
			style={{
				width: 40,
				height: 22,
				borderRadius: 11,
				border: "none",
				padding: 2,
				cursor: "pointer",
				background: checked ? color : "var(--bg-tertiary)",
				transition: "background 0.2s",
				display: "flex",
				alignItems: "center",
			}}
		>
			<div
				style={{
					width: 18,
					height: 18,
					borderRadius: "50%",
					background: "white",
					boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
					transform: checked ? "translateX(18px)" : "translateX(0)",
					transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
				}}
			/>
		</button>
	);
}
