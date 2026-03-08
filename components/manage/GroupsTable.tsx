"use client";

import { ChevronDown, ChevronUp, Pencil, Plus, Search, Trash2, Users, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DataTableShell } from "@/components/ui/data-table-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { EntityGridRow } from "@/components/ui/entity-list-row";
import { InlineButton } from "@/components/ui/inline-button";
import { InlineErrorBanner } from "@/components/ui/inline-error-banner";
import { TextInput } from "@/components/ui/text-input";
import { Typography } from "@/components/ui/typography";
import { useTranslation } from "@/hooks/useTranslation";
import { groupsApi } from "@/lib/api-client";
import type { Group } from "@/types/group";

type GroupWithCount = Group & { memberCount: number };
type SortField = "name" | "memberCount" | "createdAt";
type SortDir = "asc" | "desc";

type OpenModalFn = (modal: { type: string; group?: Group }) => void;

interface GroupsTableProps {
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
      {isActive &&
        (currentDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
    </button>
  );
}

export function GroupsTable({ openModal, refreshKey }: GroupsTableProps) {
  const { t } = useTranslation();
  const [groups, setGroups] = useState<GroupWithCount[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const fetchGroups = useCallback(async () => {
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
      setError(e instanceof Error ? e.message : t("groups.loadFailed"));
    }
  }, [t]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups, refreshKey]);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    if (!groups) return null;
    let result = groups;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((g) => g.name.toLowerCase().includes(q));
    }
    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") cmp = a.name.localeCompare(b.name);
      else if (sortField === "memberCount") cmp = a.memberCount - b.memberCount;
      else if (sortField === "createdAt") cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [groups, search, sortField, sortDir]);

  const sortableHeaders = [
    <SortHeader key="name" label={t("groups.tableName")} field="name" currentField={sortField} currentDir={sortDir} onSort={handleSort} />,
    <SortHeader key="members" label={t("groups.tableMembers")} field="memberCount" currentField={sortField} currentDir={sortDir} onSort={handleSort} />,
    <SortHeader key="created" label={t("groups.tableCreated")} field="createdAt" currentField={sortField} currentDir={sortDir} onSort={handleSort} />,
    t("groups.tableActions"),
  ];

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
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
            onChange={(e) => setSearch(e.target.value)}
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
            onClick={() => setSearch("")}
            style={{ color: "var(--text-tertiary)" }}
          >
            <X size={14} />
          </InlineButton>
        )}
        <div style={{ marginLeft: "auto" }}>
          <InlineButton
            variant="primary"
            size="sm"
            onClick={() => openModal({ type: "createGroup" })}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}
          >
            <Plus size={15} />
            {t("groups.createButton")}
          </InlineButton>
        </div>
      </div>

      {error && <InlineErrorBanner message={error} onDismiss={() => setError(null)} />}

      <DataTableShell
        headers={sortableHeaders}
        columns="2fr 1fr 1fr 190px"
        isLoading={filtered === null}
        hasRows={(filtered?.length ?? 0) > 0}
        emptyState={
          <EmptyState
            icon={<Users size={32} />}
            title={t("groups.emptyTitle")}
            subtitle={undefined}
            padding="48px 20px"
          />
        }
      >
        {(filtered ?? []).map((g, i) => (
          <EntityGridRow key={g.id} columns="2fr 1fr 1fr 190px" isLast={i === (filtered?.length ?? 0) - 1}>
            <Typography variant="bodySm" weight={500}>
              {g.name}
            </Typography>
            <Typography variant="caption" tone="secondary">
              {g.memberCount}
            </Typography>
            <Typography variant="meta" tone="tertiary">
              {formatDate(g.createdAt)}
            </Typography>
            <div style={{ display: "flex", gap: 4 }}>
              <InlineButton
                variant="ghost"
                size="xs"
                onClick={() => openModal({ type: "manageMembers", group: g })}
                title={t("groups.manageMembers")}
                style={{
                  padding: "4px 8px",
                  fontSize: "0.76rem",
                  display: "inline-flex",
                  alignItems: "center",
                  whiteSpace: "nowrap",
                  gap: 4,
                }}
              >
                <Users size={14} />
                {t("groups.manage")}
              </InlineButton>
              <InlineButton
                variant="ghost"
                size="xs"
                onClick={() => openModal({ type: "editGroup", group: g })}
                title={t("groups.renameGroupAction")}
                style={{ padding: "4px 6px", color: "var(--text-tertiary)" }}
              >
                <Pencil size={14} />
              </InlineButton>
              <InlineButton
                variant="ghost"
                size="xs"
                onClick={() => openModal({ type: "deleteGroup", group: g })}
                title={t("groups.deleteGroupAction")}
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
