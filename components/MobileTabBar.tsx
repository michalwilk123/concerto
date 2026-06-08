"use client";

import { Files, MessageSquare, UserCheck, Users, Video } from "lucide-react";
import { ButtonGroup, type ButtonGroupItem } from "@/components/ui/button-group";
import { useTranslation } from "@/hooks/useTranslation";
import type { SidebarTab } from "@/types/sidebar";

interface MobileTabBarProps {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  isTeacher: boolean;
  waitingCount: number;
}

export default function MobileTabBar({
  activeTab,
  onTabChange,
  isTeacher,
  waitingCount,
}: MobileTabBarProps) {
  const { t } = useTranslation();

  const items: ButtonGroupItem[] = [
    { id: "video", label: t("sidebar.video"), icon: <Video size={18} />, layout: "stacked" },
    { id: "chat", label: t("sidebar.chat"), icon: <MessageSquare size={18} />, layout: "stacked" },
    { id: "files", label: t("sidebar.files"), icon: <Files size={18} />, layout: "stacked" },
    { id: "participants", label: t("sidebar.participants"), icon: <Users size={18} />, layout: "stacked" },
    ...(isTeacher
      ? [
          {
            id: "waitingRoom",
            label: t("sidebar.waitingRoom"),
            icon: <UserCheck size={18} />,
            badge: waitingCount,
            layout: "stacked" as const,
          },
        ]
      : []),
  ];

  return (
    <ButtonGroup
      variant="segmented"
      size="sm"
      grow
      collapse="never"
      items={items}
      activeId={activeTab}
      onSelect={(id) => onTabChange(id as SidebarTab)}
      className="h-12 w-full shrink-0 rounded-none border-x-0 border-b-0 bg-secondary"
    />
  );
}
