"use client";

import { Plus, Search, Trash2, UserPlus, Users } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { InlineButton } from "@/components/ui/inline-button";
import { InlineErrorBanner } from "@/components/ui/inline-error-banner";
import { Modal } from "@/components/ui/modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

interface ManageMembersModalProps {
  group: Group | null;
  onClose: () => void;
}

export function ManageMembersModal({ group, onClose }: ManageMembersModalProps) {
  const { t } = useTranslation();
  const [members, setMembers] = useState<MemberWithInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; name: string; email: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [addRole, setAddRole] = useState<"teacher" | "student">("student");
  const [addingUserId, setAddingUserId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchMembers = useCallback(async () => {
    if (!group) return;
    setError(null);
    try {
      const m = await groupsApi.getMembers(group.id);
      setMembers(m);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("groupMembers.loadFailed"));
    }
  }, [group, t]);

  // eslint-disable-next-line react-you-might-not-need-an-effect/no-adjust-state-on-prop-change, react-you-might-not-need-an-effect/no-derived-state
  useEffect(() => {
    if (group) {
      setMembers(null);
      setSearch("");
      setSearchResults([]);
      setShowAddForm(false);
      fetchMembers();
    }
  }, [group, fetchMembers]);

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
        const memberIds = new Set((members ?? []).map((m) => m.userId));
        setSearchResults(results.filter((u) => !memberIds.has(u.id)));
      } catch {
        // ignore
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, members]);

  const handleAddMember = async (userId: string) => {
    if (!group) return;
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
    if (!group) return;
    try {
      await groupsApi.removeMember(group.id, userId);
      fetchMembers();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("groupMembers.removeFailed"));
    }
  };

  const memberCount = members?.length ?? 0;

  return (
    <Modal open={!!group} onClose={onClose} maxWidth={560}>
      {group && (
        <div style={{ display: "flex", flexDirection: "column", maxHeight: "80vh" }}>
          {/* Header */}
          <div
            style={{
              padding: "20px 24px 16px",
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <Typography as="h2" variant="titleMd" style={{ margin: 0 }}>
                  {group.name}
                </Typography>
                <Typography as="p" variant="meta" tone="tertiary" style={{ margin: "2px 0 0" }}>
                  {memberCount} {memberCount === 1 ? "member" : "members"}
                </Typography>
              </div>
              <InlineButton
                variant={showAddForm ? "secondary" : "primary"}
                size="sm"
                onClick={() => {
                  setShowAddForm(!showAddForm);
                  if (showAddForm) {
                    setSearch("");
                    setSearchResults([]);
                  }
                }}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                {showAddForm ? (
                  t("manage.cancel")
                ) : (
                  <>
                    <UserPlus size={14} />
                    {t("groupMembers.addMember")}
                  </>
                )}
              </InlineButton>
            </div>

            {error && (
              <div style={{ marginTop: 12 }}>
                <InlineErrorBanner message={error} onDismiss={() => setError(null)} />
              </div>
            )}

            {/* Add member search (collapsible) */}
            {showAddForm && (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                  <div style={{ position: "relative", flex: "1 1 auto", minWidth: 0 }}>
                    <Search
                      size={14}
                      style={{
                        position: "absolute",
                        left: 10,
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "var(--text-tertiary)",
                        pointerEvents: "none",
                      }}
                    />
                    <TextInput
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={t("groupMembers.searchPlaceholder")}
                      type="search"
                      autoComplete="off"
                      style={{ width: "100%", fontSize: "0.84rem", paddingLeft: 32 }}
                      autoFocus
                    />
                  </div>
                  <div style={{ flexShrink: 0, width: 110 }}>
                    <Select value={addRole} onValueChange={(v) => setAddRole(v as "teacher" | "student")}>
                      <SelectTrigger variant="compact" className="bg-[var(--bg-secondary)]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">{t("groupMembers.student")}</SelectItem>
                        <SelectItem value="teacher">{t("groupMembers.teacher")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Search results dropdown */}
                {(searchResults.length > 0 || searching) && search.trim() && (
                  <div
                    style={{
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-md)",
                      maxHeight: 180,
                      overflowY: "auto",
                      marginTop: 4,
                    }}
                  >
                    {searching ? (
                      <div style={{ padding: 16, textAlign: "center" }}>
                        <Spinner size={16} />
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div style={{ padding: "12px 16px" }}>
                        <Typography variant="meta" tone="tertiary">
                          No users found
                        </Typography>
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
                          }}
                        >
                          <div style={{ minWidth: 0, flex: 1 }}>
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
                            style={{
                              padding: "4px 10px",
                              flexShrink: 0,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Plus size={13} />
                            {t("groupMembers.add")}
                          </InlineButton>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Member list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "0 24px" }}>
            {members === null ? (
              <div style={{ padding: "32px 0", textAlign: "center" }}>
                <Spinner size={24} />
              </div>
            ) : members.length === 0 ? (
              <div
                style={{
                  padding: "40px 0",
                  textAlign: "center",
                  color: "var(--text-tertiary)",
                }}
              >
                <Users size={28} style={{ marginBottom: 8, opacity: 0.5 }} />
                <Typography variant="bodySm" tone="tertiary">
                  {t("groupMembers.emptyTitle")}
                </Typography>
              </div>
            ) : (
              <div style={{ padding: "8px 0" }}>
                {members.map((m, i) => (
                  <div
                    key={m.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 0",
                      borderBottom:
                        i < members.length - 1 ? "1px solid var(--border-subtle)" : "none",
                    }}
                  >
                    {/* Avatar */}
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background:
                          "linear-gradient(135deg, var(--bg-tertiary), var(--bg-elevated))",
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
                      {m.userName.charAt(0).toUpperCase()}
                    </div>

                    {/* Name + email */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="bodySm" weight={500} style={{ lineHeight: 1.3 }}>
                        {m.userName}
                      </Typography>
                      <Typography
                        variant="meta"
                        tone="tertiary"
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          display: "block",
                        }}
                      >
                        {m.userEmail}
                      </Typography>
                    </div>

                    {/* Role badge */}
                    <Badge label={m.role} color={ROLE_COLORS[m.role] || ROLE_COLORS.student} />

                    {/* Remove */}
                    <InlineButton
                      variant="ghost"
                      size="xs"
                      onClick={() => handleRemoveMember(m.userId)}
                      title={t("groupMembers.removeMember")}
                      style={{ padding: "4px 6px", color: "var(--text-tertiary)", flexShrink: 0 }}
                    >
                      <Trash2 size={14} />
                    </InlineButton>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer spacer */}
          <div style={{ height: 16, flexShrink: 0 }} />
        </div>
      )}
    </Modal>
  );
}
