"use client";

import { ChevronDown, ChevronUp, Search, Users, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ButtonGroup } from "@/components/ui/button-group";
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
import { MANAGE_TABLE_MAX_WIDTH, MANAGE_TABLE_MIN_WIDTH } from "./table-layout";

type GroupWithCount = Group & { memberCount: number };
type SortField = "name" | "memberCount" | "createdAt";
type SortDir = "asc" | "desc";

// Column tracks sum to 920 so the table matches the users table width
// (920 + 40px padding === MANAGE_TABLE_MIN_WIDTH).
const GROUP_TABLE_COLUMNS = "320px 160px 180px 260px";
const GROUP_TABLE_MIN_WIDTH = MANAGE_TABLE_MIN_WIDTH;
const GROUP_TABLE_MAX_WIDTH = MANAGE_TABLE_MAX_WIDTH;

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
      {isActive && (currentDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
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
    void refreshKey;
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
      else if (sortField === "createdAt")
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [groups, search, sortField, sortDir]);

  const sortableHeaders = [
    <SortHeader
      key="name"
      label={t("groups.tableName")}
      field="name"
      currentField={sortField}
      currentDir={sortDir}
      onSort={handleSort}
    />,
    <SortHeader
      key="members"
      label={t("groups.tableMembers")}
      field="memberCount"
      currentField={sortField}
      currentDir={sortDir}
      onSort={handleSort}
    />,
    <SortHeader
      key="created"
      label={t("groups.tableCreated")}
      field="createdAt"
      currentField={sortField}
      currentDir={sortDir}
      onSort={handleSort}
    />,
    t("groups.tableActions"),
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
          maxWidth: GROUP_TABLE_MAX_WIDTH,
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
        <div style={{ marginLeft: "auto", flex: "0 0 auto" }}>
          <ButtonGroup
            variant="toolbar"
            size="sm"
            aria-label={t("groups.createButton")}
            items={[
              {
                id: "create-group",
                label: t("groups.createButton"),
                tone: "primary",
                onClick: () => openModal({ type: "createGroup" }),
              },
            ]}
          />
        </div>
      </div>

      {error && <InlineErrorBanner message={error} onDismiss={() => setError(null)} />}

      <DataTableShell
        name="groups"
        headers={sortableHeaders}
        headerLabels={[
          t("groups.tableName"),
          t("groups.tableMembers"),
          t("groups.tableCreated"),
          t("groups.tableActions"),
        ]}
        columns={GROUP_TABLE_COLUMNS}
        minTableWidth={GROUP_TABLE_MIN_WIDTH}
        containerStyle={{ maxWidth: GROUP_TABLE_MAX_WIDTH, margin: "0 auto" }}
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
          <EntityGridRow
            key={g.id}
            columns={GROUP_TABLE_COLUMNS}
            isLast={i === (filtered?.length ?? 0) - 1}
          >
            <Typography variant="bodySm" weight={500} truncate>
              {g.name}
              {g.isDefault && (
                <Typography as="span" variant="meta" tone="tertiary" style={{ marginLeft: 6 }}>
                  ({t("groups.defaultBadge")})
                </Typography>
              )}
            </Typography>
            <Typography variant="caption" tone="secondary">
              {g.memberCount}
            </Typography>
            <Typography variant="meta" tone="tertiary">
              {formatDate(g.createdAt)}
            </Typography>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <ButtonGroup
                variant="toolbar"
                size="sm"
                collapse="never"
                aria-label={t("groups.tableActions")}
                items={[
                  {
                    id: "manage",
                    label: t("groups.manage"),
                    ariaLabel: t("groups.manageMembers"),
                    quiet: true,
                    onClick: () => openModal({ type: "manageMembers", group: g }),
                  },
                  {
                    id: "edit",
                    label: t("fileItem.rename"),
                    ariaLabel: t("groups.renameGroupAction"),
                    quiet: true,
                    onClick: () => openModal({ type: "editGroup", group: g }),
                  },
                  // The default group is the onboarding space everyone is auto-joined to;
                  // it must not be deletable (the API rejects it too).
                  ...(g.isDefault
                    ? []
                    : [
                        {
                          id: "delete",
                          label: t("files.delete"),
                          ariaLabel: t("groups.deleteGroupAction"),
                          quiet: true,
                          tone: "danger" as const,
                          onClick: () => openModal({ type: "deleteGroup", group: g }),
                        },
                      ]),
                ]}
              />
            </div>
          </EntityGridRow>
        ))}
      </DataTableShell>
    </div>
  );
}
