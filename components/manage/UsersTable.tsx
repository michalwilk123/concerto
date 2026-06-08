"use client";

import { ChevronDown, ChevronUp, Search, Users, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ButtonGroup, type ButtonGroupItem } from "@/components/ui/button-group";
import { DataTableShell } from "@/components/ui/data-table-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { EntityGridRow } from "@/components/ui/entity-list-row";
import { InlineButton } from "@/components/ui/inline-button";
import { InlineErrorBanner } from "@/components/ui/inline-error-banner";
import { TextInput } from "@/components/ui/text-input";
import { Typography } from "@/components/ui/typography";
import { useTranslation } from "@/hooks/useTranslation";
import { type AdminUser, adminApi } from "@/lib/api-client";
import { useSession } from "@/lib/auth-client";
import { MANAGE_TABLE_MAX_WIDTH, MANAGE_TABLE_MIN_WIDTH } from "./table-layout";

const ROLE_COLORS: Record<string, string> = {
  admin: "linear-gradient(135deg, #f59e0b, #d97706)",
  teacher: "linear-gradient(135deg, #22c55e, #16a34a)",
  student: "linear-gradient(135deg, #a78bfa, #7c3aed)",
};

const USER_TABLE_COLUMNS = "150px 220px 100px 110px 110px 230px";
const USER_TABLE_MIN_WIDTH = MANAGE_TABLE_MIN_WIDTH;
const USER_TABLE_MAX_WIDTH = MANAGE_TABLE_MAX_WIDTH;

type SortField = "name" | "email" | "role" | "createdAt" | "isActive";
type SortDir = "asc" | "desc";

type OpenModalFn = (modal: { type: string; user?: AdminUser }) => void;

interface UsersTableProps {
  openModal: OpenModalFn;
  refreshKey: number;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function SortHeader({
  label,
  field,
  currentField,
  currentDir,
  onSort,
}: {
  label: string;
  field: SortField;
  currentField: SortField;
  currentDir: SortDir;
  onSort: (field: SortField) => void;
}) {
  const isActive = field === currentField;
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      style={{
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        color: isActive ? "var(--text-primary)" : "inherit",
        fontWeight: isActive ? 600 : "inherit",
        fontSize: "inherit",
      }}
    >
      {label}
      {isActive && (currentDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
    </button>
  );
}

export function UsersTable({ openModal, refreshKey }: UsersTableProps) {
  const { t } = useTranslation();
  const { data: session } = useSession();

  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [error, setError] = useState<string | null>(null);
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
    setError(null);
    try {
      const res = await adminApi.listUsers({
        page,
        limit,
        search: debouncedSearch || undefined,
        sortBy: sortField,
        sortDir,
      });
      setUsers(res.users);
      setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("manage.loadUsersFailed"));
    }
  }, [page, limit, debouncedSearch, sortField, sortDir, t]);

  useEffect(() => {
    void refreshKey;
    fetchUsers();
  }, [fetchUsers, refreshKey]);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
    setPage(1);
  };

  const handleToggleActive = async (u: AdminUser) => {
    try {
      await adminApi.updateUser(u.id, { isActive: !u.isActive });
      fetchUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("manage.updateUserFailed"));
    }
  };

  const totalPages = Math.ceil(total / limit);

  const sortableHeaders = [
    <SortHeader
      key="name"
      label={t("manage.tableName")}
      field="name"
      currentField={sortField}
      currentDir={sortDir}
      onSort={handleSort}
    />,
    <SortHeader
      key="email"
      label={t("manage.tableEmail")}
      field="email"
      currentField={sortField}
      currentDir={sortDir}
      onSort={handleSort}
    />,
    <SortHeader
      key="role"
      label={t("manage.tableRole")}
      field="role"
      currentField={sortField}
      currentDir={sortDir}
      onSort={handleSort}
    />,
    <SortHeader
      key="status"
      label={t("manage.tableStatus")}
      field="isActive"
      currentField={sortField}
      currentDir={sortDir}
      onSort={handleSort}
    />,
    <SortHeader
      key="created"
      label={t("manage.tableCreated")}
      field="createdAt"
      currentField={sortField}
      currentDir={sortDir}
      onSort={handleSort}
    />,
    t("manage.tableActions"),
  ];

  return (
    <div>
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          margin: "0 auto 20px",
          maxWidth: USER_TABLE_MAX_WIDTH,
        }}
      >
        <div style={{ position: "relative", flex: "1 1 240px", maxWidth: 360, minWidth: 240 }}>
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
            type="search"
            autoComplete="off"
            style={{ width: "100%", paddingLeft: 36, fontSize: "0.84rem" }}
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
        <div style={{ marginLeft: "auto", flex: "0 0 auto" }}>
          <ButtonGroup
            variant="toolbar"
            size="sm"
            aria-label={t("manage.createUserButton")}
            items={[
              {
                id: "create-user",
                label: t("manage.createUserButton"),
                tone: "primary",
                onClick: () => openModal({ type: "createUser" }),
              },
            ]}
          />
        </div>
      </div>

      {error && <InlineErrorBanner message={error} onDismiss={() => setError(null)} />}

      <DataTableShell
        name="users"
        headers={sortableHeaders}
        headerLabels={[
          t("manage.tableName"),
          t("manage.tableEmail"),
          t("manage.tableRole"),
          t("manage.tableStatus"),
          t("manage.tableCreated"),
          t("manage.tableActions"),
        ]}
        columns={USER_TABLE_COLUMNS}
        minTableWidth={USER_TABLE_MIN_WIDTH}
        containerStyle={{ maxWidth: USER_TABLE_MAX_WIDTH, margin: "0 auto" }}
        isLoading={users === null}
        hasRows={(users?.length ?? 0) > 0}
        emptyState={
          <EmptyState
            icon={<Users size={32} />}
            title={debouncedSearch ? t("manage.noUsersMatch") : t("manage.noUsersFound")}
            subtitle={undefined}
            padding="48px 20px"
          />
        }
      >
        {(users ?? []).map((u, i) => (
          <EntityGridRow
            key={u.id}
            columns={USER_TABLE_COLUMNS}
            isLast={i === (users?.length ?? 0) - 1}
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
                title={u.name}
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
              title={u.email}
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

            <div>
              <button
                type="button"
                onClick={() => {
                  if (session && u.id !== session.user.id) handleToggleActive(u);
                }}
                title={t("manage.toggleActive")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: session && u.id !== session.user.id ? "pointer" : "default",
                  padding: 0,
                  font: "inherit",
                  fontSize: "0.8rem",
                }}
              >
                {u.isActive && !u.banned ? "Yes" : "No"}
              </button>
            </div>

            <span style={{ fontSize: "0.78rem", color: "var(--text-tertiary)" }}>
              {formatDate(u.createdAt)}
            </span>

            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <ButtonGroup
                variant="toolbar"
                size="sm"
                aria-label={t("manage.tableActions")}
                items={[
                  {
                    id: "edit",
                    label: t("common.edit"),
                    ariaLabel: t("manage.editUserAction"),
                    quiet: true,
                    onClick: () => openModal({ type: "editUser", user: u }),
                  },
                  {
                    id: "reset",
                    label: t("manage.resetPasswordAction"),
                    ariaLabel: t("manage.resetPasswordAction"),
                    quiet: true,
                    onClick: () => openModal({ type: "resetPassword", user: u }),
                  },
                  ...(session && u.id !== session.user.id
                    ? [
                        {
                          id: "delete",
                          label: t("files.delete"),
                          ariaLabel: t("manage.deleteUserAction"),
                          quiet: true,
                          tone: "danger",
                          onClick: () => openModal({ type: "deleteUser", user: u }),
                        } as ButtonGroupItem,
                      ]
                    : []),
                ]}
              />
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
    </div>
  );
}
