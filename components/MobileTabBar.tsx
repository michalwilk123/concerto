"use client";

import { Files, MessageSquare, UserCheck, Users, Video } from "lucide-react";
import type { SidebarTab } from "@/types/sidebar";

interface MobileTabBarProps {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  isTeacher: boolean;
  waitingCount: number;
}

interface TabDef {
  id: SidebarTab;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export default function MobileTabBar({
  activeTab,
  onTabChange,
  isTeacher,
  waitingCount,
}: MobileTabBarProps) {
  const tabs: TabDef[] = [
    { id: "video", label: "Video", icon: <Video size={18} /> },
    { id: "chat", label: "Chat", icon: <MessageSquare size={18} /> },
    { id: "files", label: "Files", icon: <Files size={18} /> },
    { id: "participants", label: "People", icon: <Users size={18} /> },
    ...(isTeacher
      ? [{ id: "waitingRoom" as SidebarTab, label: "Waiting", icon: <UserCheck size={18} />, badge: waitingCount }]
      : []),
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        width: "100%",
        height: 48,
        background: "var(--bg-secondary)",
        borderTop: "1px solid var(--border-subtle)",
        flexShrink: 0,
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              background: "transparent",
              border: "none",
              borderTop: isActive ? "2px solid var(--accent-purple)" : "2px solid transparent",
              borderRadius: 0,
              padding: "4px 0 2px",
              cursor: "pointer",
              color: isActive ? "var(--accent-purple)" : "var(--text-tertiary)",
              fontWeight: isActive ? 600 : 400,
              position: "relative",
            }}
          >
            {tab.icon}
            <span style={{ fontSize: 11 }}>{tab.label}</span>
            {tab.badge != null && tab.badge > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: 4,
                  right: "calc(50% - 18px)",
                  background: "var(--accent-purple)",
                  color: "white",
                  borderRadius: "50%",
                  width: 16,
                  height: 16,
                  fontSize: 10,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {tab.badge > 9 ? "9+" : tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
