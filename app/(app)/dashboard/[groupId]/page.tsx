"use client";

import { Files, Film, MessageSquare, PanelRightOpen } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChatProvider } from "@/components/chat/ChatProvider";
import { MeetChatPanel } from "@/components/chat/MeetChatPanel";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { FileBrowserPanel } from "@/components/files/FileBrowserPanel";
import { MeetingsPanel } from "@/components/meetings/MeetingsPanel";
import { ResizableSidebar } from "@/components/ResizableSidebar";
import { MeetingRecordingsPanel } from "@/components/recordings/MeetingRecordingsPanel";
import { TranslationsPanel } from "@/components/translations/TranslationsPanel";
import { IconButton } from "@/components/ui/icon-button";
import { LoadingIndicator } from "@/components/ui/loading-state";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useTranslation } from "@/hooks/useTranslation";
import { useRouter } from "@/i18n/navigation";
import { filesApi, foldersApi } from "@/lib/api-client";
import { useSession } from "@/lib/auth-client";
import { buildDashboardUrl, type DashboardTab } from "@/lib/dashboard-url";
import { logger } from "@/lib/logger";
import { useFileManagerStore } from "@/stores/file-manager-store";
import type { FolderDoc } from "@/types/files";

type MeetingSidebarTab = "chat" | "files" | "recordings";

export default function DashboardGroupPage() {
  const router = useRouter();
  const params = useParams<{ groupId: string }>();
  const searchParams = useSearchParams();
  const { data: session, isPending } = useSession();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const hasSeeded = useRef(false);
  const [ancestors, setAncestors] = useState<FolderDoc[]>([]);
  const [chatSidebarOpen, setChatSidebarOpen] = useState(true);
  const [meetingSidebarTab, setMeetingSidebarTab] = useState<MeetingSidebarTab>("chat");
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

  // Sync groupId to store. While a meeting is selected its sidebar panel owns the
  // (single-context) file store, so skip group sync until the meeting is deselected.
  useEffect(() => {
    if (selectedMeetingId) return;
    setCurrentGroupId(groupId);
  }, [groupId, setCurrentGroupId, selectedMeetingId]);

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

  // Sync folderId to store and fetch contents (group context only — the meeting
  // sidebar's file panel manages the store while a meeting is selected).
  useEffect(() => {
    if (!user || selectedMeetingId) return;
    setCurrentFolderId(folderId);
    fetchContents(folderId);
  }, [folderId, user, setCurrentFolderId, fetchContents, selectedMeetingId]);

  // Seed files for teacher/admin on first visit (group context only).
  useEffect(() => {
    if (!user || !isPrivileged || hasSeeded.current || selectedMeetingId) return;
    hasSeeded.current = true;

    filesApi
      .seed(groupId)
      .then(() => {
        fetchContents(folderId);
      })
      .catch((error) => {
        logger.warn("[dashboard] file seeding failed", error);
      });
  }, [user, isPrivileged, groupId, fetchContents, folderId, selectedMeetingId]);

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
      <DashboardSidebar meetingsFolderName={null} groupId={groupId} activeTab={activeTab} />
      <main style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {activeTab === "translations" ? (
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <TranslationsPanel />
          </div>
        ) : activeTab === "meetings" ? (
          <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
            <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
              <div style={{ maxWidth: 1200, margin: "0 auto" }}>
                <MeetingsPanel
                  groupId={groupId}
                  selectedMeetingId={selectedMeetingId ?? undefined}
                  onSelectMeeting={handleSelectMeeting}
                  isPrivileged={isPrivileged}
                  headerExtra={
                    selectedMeetingId && !chatSidebarOpen ? (
                      <IconButton
                        aria-label={t("dashboard.openChatSidebar")}
                        onClick={() => setChatSidebarOpen(true)}
                        size="md"
                        title={t("dashboard.openChatSidebar")}
                        variant="square"
                      >
                        <PanelRightOpen size={16} />
                      </IconButton>
                    ) : undefined
                  }
                />
              </div>
            </div>
            {selectedMeetingId && chatSidebarOpen && (
              // ChatProvider wraps the whole sidebar (not just the chat tab) so the
              // chat WebSocket + history load in the background as soon as a meeting
              // is selected, regardless of which tab is active.
              <ChatProvider key={`meeting-chat-${selectedMeetingId}`} meetingId={selectedMeetingId}>
                <ResizableSidebar
                  tabs={[
                    {
                      id: "chat",
                      label: t("dashboard.meetingChat"),
                      icon: <MessageSquare size={14} />,
                    },
                    { id: "files", label: t("sidebar.files"), icon: <Files size={14} /> },
                    ...(isPrivileged
                      ? [
                          {
                            id: "recordings",
                            label: t("sidebar.recordings"),
                            icon: <Film size={14} />,
                          },
                        ]
                      : []),
                  ]}
                  activeTab={meetingSidebarTab}
                  onTabChange={(tab) => setMeetingSidebarTab(tab as MeetingSidebarTab)}
                  onClose={() => setChatSidebarOpen(false)}
                  storageKey="dashboard-meeting-sidebar-width"
                >
                  {/* Chat — kept mounted (hidden when inactive) so history is ready instantly. */}
                  <div
                    style={{
                      display: meetingSidebarTab === "chat" ? "flex" : "none",
                      flex: 1,
                      minHeight: 0,
                    }}
                  >
                    <MeetChatPanel />
                  </div>
                  {/* Files — mounted from meeting selection (hidden when inactive) so the
                      list fetches in the background and the tab opens instantly. */}
                  <div
                    style={{
                      display: meetingSidebarTab === "files" ? "block" : "none",
                      flex: 1,
                      overflow: "auto",
                      height: "100%",
                    }}
                  >
                    <FileBrowserPanel
                      key={`meeting-files-${selectedMeetingId}`}
                      meetingId={selectedMeetingId}
                      groupId={groupId}
                      allowManage={isPrivileged}
                      allowUpload
                      showCreateFolderButton={isPrivileged}
                      compact
                      ancestors={[]}
                    />
                  </div>
                  {/* Recordings — mounted from meeting selection (hidden when inactive) so they
                      fetch in the background and the tab opens instantly. */}
                  {isPrivileged && (
                    <div
                      style={{
                        display: meetingSidebarTab === "recordings" ? "block" : "none",
                        flex: 1,
                        overflow: "auto",
                        height: "100%",
                      }}
                    >
                      <MeetingRecordingsPanel
                        key={`meeting-recordings-${selectedMeetingId}`}
                        meetingId={selectedMeetingId}
                        groupId={groupId}
                        active={meetingSidebarTab === "recordings"}
                      />
                    </div>
                  )}
                </ResizableSidebar>
              </ChatProvider>
            )}
          </div>
        ) : (
          <div style={{ flex: 1, overflow: "auto", padding: isMobile ? 12 : 24 }}>
            <div style={{ maxWidth: 1200, margin: "0 auto" }}>
              <FileBrowserPanel
                allowManage={isPrivileged}
                allowUpload
                showCreateFolderButton={isPrivileged}
                groupId={groupId}
                folderId={folderId}
                ancestors={ancestors}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
