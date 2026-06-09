"use client";

import { Files, MessageSquare, UserCheck, Users } from "lucide-react";
import { MeetChatPanel } from "@/components/chat/MeetChatPanel";
import { FileBrowserPanel } from "@/components/files/FileBrowserPanel";
import { ResizableSidebar, type SidebarTabConfig } from "@/components/ResizableSidebar";
import { useTranslation } from "@/hooks/useTranslation";
import { useWaitingRoom } from "@/hooks/useWaitingRoom";
import { useRoomStore } from "@/stores/room-store";
import type { RoomParticipant } from "@/types/room";
import { isTeacher } from "@/types/room";
import type { SidebarTab } from "@/types/sidebar";
import ParticipantMenu from "./ParticipantMenu";
import WaitingRoomPanel from "./WaitingRoomPanel";
export type { SidebarTab };

interface SidebarProps {
  participants: RoomParticipant[];
  onClose: () => void;
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  isOpen: boolean;
}

export default function Sidebar({
  participants,
  onClose,
  activeTab,
  onTabChange,
  isOpen,
}: SidebarProps) {
  const { role, meetingId, groupId } = useRoomStore();
  const { t } = useTranslation();
  const { waiting, removeParticipant } = useWaitingRoom(meetingId ?? "", role);

  if (!isOpen) return null;

  const waitingCount = waiting.length;

  const tabs: (SidebarTabConfig & { visible: boolean })[] = [
    {
      id: "participants",
      label: t("sidebar.participants"),
      icon: <Users size={16} />,
      visible: true,
    },
    { id: "files", label: t("sidebar.files"), icon: <Files size={16} />, visible: true },
    { id: "chat", label: t("sidebar.chat"), icon: <MessageSquare size={16} />, visible: true },
    {
      id: "waitingRoom",
      label: t("sidebar.waitingRoom"),
      icon: <UserCheck size={16} />,
      visible: isTeacher(role),
      badge: waitingCount,
    },
  ];

  const visibleTabs = tabs.filter((t) => t.visible);

  return (
    <ResizableSidebar
      tabs={visibleTabs}
      activeTab={activeTab}
      onTabChange={(tab) => onTabChange(tab as SidebarTab)}
      onClose={onClose}
      storageKey="meeting-sidebar-width"
    >
      {activeTab === "participants" && <ParticipantMenu participants={participants} />}
      {activeTab === "files" && meetingId && groupId && (
        <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
          <FileBrowserPanel
            key={`files-${meetingId}`}
            meetingId={meetingId}
            groupId={groupId}
            allowManage={isTeacher(role)}
            showCreateFolderButton={isTeacher(role)}
            compact
            ancestors={[]}
          />
        </div>
      )}
      {meetingId && (
        <div
          style={{
            display: activeTab === "chat" ? "flex" : "none",
            flex: 1,
            minHeight: 0,
          }}
        >
          <MeetChatPanel />
        </div>
      )}
      {activeTab === "waitingRoom" && meetingId && (
        <WaitingRoomPanel
          meetingId={meetingId}
          waiting={waiting}
          onParticipantHandled={removeParticipant}
        />
      )}
    </ResizableSidebar>
  );
}
