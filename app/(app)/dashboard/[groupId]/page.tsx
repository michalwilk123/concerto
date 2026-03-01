"use client";

import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { MeetChatPanel } from "@/components/chat/MeetChatPanel";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { FileBrowserPanel } from "@/components/files/FileBrowserPanel";
import { ManagePanel } from "@/components/manage/ManagePanel";
import { MeetingsPanel } from "@/components/meetings/MeetingsPanel";
import { RecordingsPanel } from "@/components/recordings/RecordingsPanel";
import { TranslationsPanel } from "@/components/translations/TranslationsPanel";
import { LoadingIndicator } from "@/components/ui/loading-state";
import { filesApi, foldersApi } from "@/lib/api-client";
import { useSession } from "@/lib/auth-client";
import { buildDashboardUrl, type DashboardTab } from "@/lib/dashboard-url";
import { useFileManagerStore } from "@/stores/file-manager-store";
import { useTranslation } from "@/hooks/useTranslation";
import type { FolderDoc } from "@/types/files";

export default function DashboardGroupPage() {
  const router = useRouter();
  const params = useParams<{ groupId: string }>();
  const searchParams = useSearchParams();
  const { data: session, isPending } = useSession();
  const { t } = useTranslation();
  const hasSeeded = useRef(false);
  const [meetingsFolderName, setMeetingsFolderName] = useState<string | null>(null);
  const [ancestors, setAncestors] = useState<FolderDoc[]>([]);
  const [chatSidebarOpen, setChatSidebarOpen] = useState(true);
  const { fetchContents, setCurrentGroupId, setCurrentFolderId } = useFileManagerStore();

  const groupId = params.groupId;
  const activeTab = (searchParams.get("tab") as DashboardTab) || "files";
  const folderId = searchParams.get("folderId") || null;
  const selectedMeetingId = searchParams.get("meetingId") || null;

  const user = session?.user;
  const isUserActive = (session?.user as { isActive?: boolean } | undefined)?.isActive ?? true;
  const isPrivileged = user?.role === "teacher" || user?.role === "admin";

  // Redirect unauthenticated users
  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
      return;
    }
    if (!isPending && session && !isUserActive) {
      router.push("/waiting-approval");
    }
  }, [isPending, session, router, isUserActive]);

  // Sync groupId to store
  useEffect(() => {
    setCurrentGroupId(groupId);
  }, [groupId, setCurrentGroupId]);

  // Fetch ancestors when folderId changes
  useEffect(() => {
    if (!user) return;

    if (!folderId) {
      setAncestors([]);
      return;
    }

    let cancelled = false;
    foldersApi
      .getAncestors(folderId)
      .then((result) => {
        if (!cancelled) setAncestors(result);
      })
      .catch(() => {
        if (!cancelled) setAncestors([]);
      });
    return () => {
      cancelled = true;
    };
  }, [folderId, user]);

  // Sync folderId to store and fetch contents
  useEffect(() => {
    if (!user) return;
    setCurrentFolderId(folderId);
    fetchContents(folderId);
  }, [folderId, user, setCurrentFolderId, fetchContents]);

  // Seed files for teacher/admin on first visit
  useEffect(() => {
    if (!user || !isPrivileged || hasSeeded.current) return;
    hasSeeded.current = true;

    filesApi
      .seed(groupId)
      .then(() => {
        fetchContents(folderId);
      })
      .catch(() => {});
  }, [user, isPrivileged, groupId, fetchContents, folderId]);

  // Load meetings folder name for teacher/admin
  useEffect(() => {
    if (!user || !isPrivileged) return;
    foldersApi
      .findMeetingsFolder(groupId)
      .then((folder) => {
        if (folder) setMeetingsFolderName(folder.name);
      })
      .catch(() => {});
  }, [user, isPrivileged, groupId]);

  const handleSelectMeeting = useCallback(
    (meetingId: string | null) => {
      router.push(
        buildDashboardUrl(groupId, {
          tab: "meetings",
          meetingId,
        }),
      );
    },
    [router, groupId],
  );

  if (isPending) {
    return (
      <LoadingIndicator
        message={t("dashboard.loading")}
        minHeight="100%"
        containerStyle={{ flex: 1 }}
      />
    );
  }

  if (!session || !isUserActive) return null;

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden", background: "var(--bg-primary)" }}>
      <DashboardSidebar
        meetingsFolderName={meetingsFolderName}
        groupId={groupId}
        activeTab={activeTab}
      />
      <main style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {activeTab === "translations" ? (
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <TranslationsPanel />
          </div>
        ) : activeTab === "manage" ? (
          <div style={{ flex: 1, overflow: "auto" }}>
            <ManagePanel />
          </div>
        ) : activeTab === "meetings" ? (
          <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
            <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
              <div style={{ maxWidth: 1200, margin: "0 auto" }}>
                <MeetingsPanel
                  groupId={groupId}
                  selectedMeetingId={selectedMeetingId ?? undefined}
                  onSelectMeeting={handleSelectMeeting}
                  headerExtra={
                    !chatSidebarOpen ? (
                      <button
                        type="button"
                        onClick={() => setChatSidebarOpen(true)}
                        title={t("dashboard.openChatSidebar")}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 32,
                          height: 32,
                          border: "1px solid var(--border-default)",
                          borderRadius: "var(--radius-md)",
                          background: "var(--bg-primary)",
                          color: "var(--text-secondary)",
                          cursor: "pointer",
                        }}
                      >
                        <PanelRightOpen size={16} />
                      </button>
                    ) : undefined
                  }
                />
              </div>
            </div>
            {chatSidebarOpen && (
              <div
                style={{
                  width: 360,
                  flexShrink: 0,
                  borderLeft: "1px solid var(--border-primary)",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--border-primary)",
                    fontWeight: 600,
                    fontSize: 14,
                    color: "var(--text-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  {t("dashboard.meetingChat")}
                  <button
                    type="button"
                    onClick={() => setChatSidebarOpen(false)}
                    title={t("dashboard.closeChatSidebar")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 28,
                      height: 28,
                      border: "none",
                      borderRadius: "var(--radius-sm)",
                      background: "transparent",
                      color: "var(--text-tertiary)",
                      cursor: "pointer",
                    }}
                  >
                    <PanelRightClose size={16} />
                  </button>
                </div>
                <div style={{ flex: 1, overflow: "hidden" }}>
                  {selectedMeetingId ? (
                    <MeetChatPanel meetingId={selectedMeetingId} />
                  ) : (
                    <div
                      style={{
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--text-tertiary)",
                        fontSize: "0.82rem",
                      }}
                    >
                      {t("dashboard.selectMeeting")}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
            <div style={{ maxWidth: 1200, margin: "0 auto" }}>
              {activeTab === "files" ? (
                <FileBrowserPanel
                  allowManage={isPrivileged}
                  showCreateFolderButton={isPrivileged}
                  groupId={groupId}
                  folderId={folderId}
                  ancestors={ancestors}
                />
              ) : (
                <RecordingsPanel groupId={groupId} />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
