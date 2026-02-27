"use client";

import { Files, MessageSquare, Users, UserCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MeetChatPanel } from "@/components/chat/MeetChatPanel";
import { FileBrowserPanel } from "@/components/files/FileBrowserPanel";
import { IconButton } from "@/components/ui/icon-button";
import { useTranslation } from "@/hooks/useTranslation";
import { roomApi, type WaitingParticipant } from "@/lib/api-client";
import { useRoomStore } from "@/stores/room-store";
import type { RoomParticipant } from "@/types/room";
import { isTeacher } from "@/types/room";
import type { SidebarTab } from "@/types/sidebar";
import ParticipantMenu from "./ParticipantMenu";
import WaitingRoomPanel from "./WaitingRoomPanel";
export type { SidebarTab };

interface SidebarProps {
  participants: RoomParticipant[];
  groupId: string;
  meetingFolderId?: string;
  onClose: () => void;
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  isOpen: boolean;
}

export default function Sidebar({
  participants,
  groupId,
  meetingFolderId,
  onClose,
  activeTab,
  onTabChange,
  isOpen,
}: SidebarProps) {
  const { role, meetingId } = useRoomStore();
  const { t } = useTranslation();
  const [portalElement, setPortalElement] = useState<HTMLElement | null>(null);
  const [waiting, setWaiting] = useState<WaitingParticipant[]>([]);

  useEffect(() => {
    if (!isTeacher(role) || !meetingId) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const result = await roomApi.listWaiting(meetingId);
        if (!cancelled) {
          setWaiting(result.waiting);
        }
      } catch {
        // ignore, keep polling
      }
    };

    poll();
    const interval = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [role, meetingId]);

  const waitingCount = waiting.length;

  useEffect(() => {
    let element = document.getElementById("portal-root");
    let createdPortalRoot = false;

    if (!element) {
      element = document.createElement("div");
      element.id = "portal-root";
      document.body.appendChild(element);
      createdPortalRoot = true;
    }

    setPortalElement(element);

    return () => {
      if (createdPortalRoot && element?.parentNode) {
        element.parentNode.removeChild(element);
      }
    };
  }, []);

  const tabs: { id: SidebarTab; label: string; icon: React.ReactNode; visible: boolean }[] = [
    {
      id: "participants",
      label: t("sidebar.participants"),
      icon: <Users size={15} />,
      visible: true,
    },
    { id: "files", label: t("sidebar.files"), icon: <Files size={15} />, visible: true },
    { id: "chat", label: t("sidebar.chat"), icon: <MessageSquare size={15} />, visible: true },
    {
      id: "waitingRoom",
      label: t("sidebar.waitingRoom"),
      icon: <UserCheck size={15} />,
      visible: isTeacher(role),
    },
  ];

  const visibleTabs = tabs.filter((t) => t.visible);

  const sidebarContent = (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          opacity: isOpen ? 1 : 0,
          visibility: isOpen ? "visible" : "hidden",
          transition: "opacity 0.3s ease, visibility 0.3s ease",
          pointerEvents: isOpen ? "auto" : "none",
          zIndex: 1000,
        }}
      />

      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 360,
          background: "var(--bg-secondary)",
          borderLeft: "1px solid var(--border-subtle)",
          display: "flex",
          flexDirection: "column",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s ease",
          boxShadow: isOpen ? "-4px 0 12px rgba(0, 0, 0, 0.15)" : "none",
          zIndex: 1000,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            borderBottom: "1px solid var(--border-subtle)",
            padding: "0 var(--space-sm)",
            gap: 0,
          }}
        >
          <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "var(--space-xs)",
                  padding: "var(--space-md) var(--space-sm)",
                  background: "transparent",
                  border: "none",
                  borderBottom:
                    activeTab === tab.id
                      ? "2px solid var(--text-primary)"
                      : "2px solid transparent",
                  borderRadius: 0,
                  color: activeTab === tab.id ? "var(--text-primary)" : "var(--text-secondary)",
                  fontSize: "0.8rem",
                  fontWeight: activeTab === tab.id ? 600 : 400,
                  cursor: "pointer",
                  transition: "color 0.15s ease, border-color 0.15s ease",
                  whiteSpace: "nowrap",
                  position: "relative",
                }}
              >
                {tab.icon}
                {tab.label}
                {tab.id === "waitingRoom" && waitingCount > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: 6,
                      right: 4,
                      background: "var(--accent-purple)",
                      color: "#fff",
                      borderRadius: "50%",
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      minWidth: 16,
                      height: 16,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0 3px",
                    }}
                  >
                    {waitingCount}
                  </span>
                )}
              </button>
            ))}
          </div>
          <IconButton
            variant="square"
            size="sm"
            onClick={onClose}
            title={t("sidebar.close")}
            style={{ borderRadius: "var(--radius-sm)" }}
          >
            <X size={16} />
          </IconButton>
        </div>

        <div
          style={{
            flex: 1,
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          {activeTab === "participants" && <ParticipantMenu participants={participants} />}
          {activeTab === "files" && (
            <FileBrowserPanel
              allowManage={isTeacher(role)}
              showCreateFolderButton={false}
              compact
              groupId={groupId}
              ancestors={[]}
              initialFolderId={meetingFolderId}
            />
          )}
          {activeTab === "chat" && meetingId && <MeetChatPanel meetingId={meetingId} />}
          {activeTab === "waitingRoom" && meetingId && (
            <WaitingRoomPanel
              meetingId={meetingId}
              waiting={waiting}
              onParticipantHandled={(name) =>
                setWaiting((prev) => prev.filter((p) => p.participantName !== name))
              }
            />
          )}
        </div>
      </div>
    </>
  );

  if (!portalElement) return null;

  return createPortal(sidebarContent, portalElement);
}
