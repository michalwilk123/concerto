"use client";

import { ArrowLeft } from "lucide-react";
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Link } from "@/i18n/navigation";
import { useTranslation } from "@/hooks/useTranslation";
import { type AdminUser, adminApi, groupsApi } from "@/lib/api-client";
import type { Group } from "@/types/group";
import { GroupsTable } from "./GroupsTable";
import { UsersTable } from "./UsersTable";
import { CreateGroupModal } from "./modals/CreateGroupModal";
import { CreateUserModal } from "./modals/CreateUserModal";
import { DeleteConfirmModal } from "./modals/DeleteConfirmModal";
import { EditGroupModal } from "./modals/EditGroupModal";
import { EditUserModal } from "./modals/EditUserModal";
import { ManageMembersModal } from "./modals/ManageMembersModal";
import { ResetPasswordModal } from "./modals/ResetPasswordModal";

type Tab = "users" | "groups";

type ActiveModal =
  | null
  | { type: "editUser"; user: AdminUser }
  | { type: "createUser" }
  | { type: "deleteUser"; user: AdminUser }
  | { type: "resetPassword"; user: AdminUser }
  | { type: "editGroup"; group: Group }
  | { type: "createGroup" }
  | { type: "deleteGroup"; group: Group }
  | { type: "manageMembers"; group: Group };

export function ManagePanel() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("users");
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const closeModal = useCallback(() => setActiveModal(null), []);

  const handleModalSuccess = useCallback(() => {
    closeModal();
    refresh();
  }, [closeModal, refresh]);

  const openModal = useCallback((modal: { type: string; user?: AdminUser; group?: Group }) => {
    setActiveModal(modal as ActiveModal);
  }, []);

  const handleDeleteUser = async () => {
    if (activeModal?.type !== "deleteUser") return;
    setDeleteLoading(true);
    try {
      await adminApi.deleteUser(activeModal.user.id);
      handleModalSuccess();
    } catch {
      // error handled by inline banner in table
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (activeModal?.type !== "deleteGroup") return;
    setDeleteLoading(true);
    try {
      await groupsApi.delete(activeModal.group.id);
      handleModalSuccess();
    } catch {
      // error handled by inline banner in table
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div style={{ padding: "32px 40px" }}>
      {/* Back to dashboard */}
      <Button asChild variant="ghost" size="sm" className="mb-5 -ml-3 gap-2">
        <Link href="/dashboard">
          <ArrowLeft className="size-4" />
          {t("manage.back")}
        </Link>
      </Button>

      {/* Tab bar */}
      <ButtonGroup
        variant="segmented"
        collapse="never"
        items={[
          { id: "users", label: t("manage.tabUsers") },
          { id: "groups", label: t("manage.tabGroups") },
        ]}
        activeId={tab}
        onSelect={(id) => setTab(id as Tab)}
        className="mb-7 w-fit"
      />

      {/* Active table */}
      {tab === "users" && <UsersTable openModal={openModal} refreshKey={refreshKey} />}
      {tab === "groups" && <GroupsTable openModal={openModal} refreshKey={refreshKey} />}

      {/* Modals */}
      <EditUserModal
        user={activeModal?.type === "editUser" ? activeModal.user : null}
        onClose={closeModal}
        onSuccess={handleModalSuccess}
      />
      <CreateUserModal
        open={activeModal?.type === "createUser"}
        onClose={closeModal}
        onSuccess={handleModalSuccess}
      />
      <ResetPasswordModal
        user={activeModal?.type === "resetPassword" ? activeModal.user : null}
        onClose={closeModal}
        onSuccess={handleModalSuccess}
      />
      <DeleteConfirmModal
        open={activeModal?.type === "deleteUser"}
        title={t("manage.deleteUserTitle")}
        message={
          activeModal?.type === "deleteUser"
            ? t("manage.deleteUserMessage", { name: activeModal.user.name })
            : ""
        }
        warning={t("manage.deleteUserWarning")}
        onConfirm={handleDeleteUser}
        onClose={closeModal}
        loading={deleteLoading}
      />
      <EditGroupModal
        group={activeModal?.type === "editGroup" ? activeModal.group : null}
        onClose={closeModal}
        onSuccess={handleModalSuccess}
      />
      <CreateGroupModal
        open={activeModal?.type === "createGroup"}
        onClose={closeModal}
        onSuccess={handleModalSuccess}
      />
      <DeleteConfirmModal
        open={activeModal?.type === "deleteGroup"}
        title={t("groups.deleteTitle")}
        message={
          activeModal?.type === "deleteGroup"
            ? t("groups.deleteMessage", { name: activeModal.group.name })
            : ""
        }
        warning={t("groups.deleteWarning")}
        onConfirm={handleDeleteGroup}
        onClose={closeModal}
        loading={deleteLoading}
      />
      <ManageMembersModal
        group={activeModal?.type === "manageMembers" ? activeModal.group : null}
        onClose={closeModal}
      />
    </div>
  );
}
