"use client";

import { FolderOpen, HardDrive, Languages, Music, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { ProgressBar } from "@/components/ui/progress-bar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ButtonGroup, type ButtonGroupItem } from "@/components/ui/button-group";
import { useTranslation } from "@/hooks/useTranslation";
import { useRouter } from "@/i18n/navigation";
import { groupsApi } from "@/lib/api-client";
import { useSession } from "@/lib/auth-client";
import { buildDashboardUrl, type DashboardTab } from "@/lib/dashboard-url";
import { logger } from "@/lib/logger";
import { useFileManagerStore } from "@/stores/file-manager-store";
import type { Group } from "@/types/group";

interface DashboardSidebarProps {
  meetingsFolderName: string | null;
  groupId: string;
  activeTab?: DashboardTab;
}

export function DashboardSidebar({
  meetingsFolderName: _meetingsFolderName,
  groupId,
  activeTab,
}: DashboardSidebarProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const { storageUsed, fetchStorage } = useFileManagerStore();
  const [groups, setGroups] = useState<Group[]>([]);
  const { t } = useTranslation();

  useEffect(() => {
    fetchStorage(groupId);
  }, [fetchStorage, groupId]);

  useEffect(() => {
    if (!session) return;
    groupsApi
      .list()
      .then(setGroups)
      .catch((error) => {
        logger.warn("[dashboard-sidebar] failed to load groups", error);
      });
  }, [session]);

  const activeItem = activeTab || "files";

  const navItems: ButtonGroupItem[] = [
    {
      id: "files",
      label: t("common.navigation.myFiles"),
      icon: <FolderOpen size={18} />,
      onClick: () => router.push(buildDashboardUrl(groupId)),
    },
    {
      id: "meetings",
      label: t("common.navigation.meetings"),
      icon: <Music size={18} />,
      onClick: () => router.push(buildDashboardUrl(groupId, { tab: "meetings" })),
    },
    ...(isAdmin
      ? [
          {
            id: "translations",
            label: t("common.navigation.translations"),
            icon: <Languages size={18} />,
            onClick: () => router.push(buildDashboardUrl(groupId, { tab: "translations" })),
          },
        ]
      : []),
  ];

  const storageLimit = 1024 * 1024 * 1024; // 1GB
  const usedPercentage = Math.min((storageUsed / storageLimit) * 100, 100);
  const androidApkUrl = process.env.NEXT_PUBLIC_ANDROID_APK_URL;

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  return (
    <aside
      style={{
        width: 220,
        flexShrink: 0,
        background: "var(--bg-secondary)",
        borderRight: "1px solid var(--border-subtle)",
        display: "flex",
        flexDirection: "column",
        padding: "16px 0",
      }}
    >
      <nav style={{ flex: 1, padding: "0 8px" }}>
        <div>
          {groups.length > 1 && (
            <div style={{ padding: "0 4px", marginBottom: 12 }}>
              <div
                style={{
                  margin: "0 0 6px 2px",
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  color: "var(--text-tertiary)",
                  textTransform: "uppercase",
                }}
              >
                {t("sidebar.group")}
              </div>
              <Select value={groupId} onValueChange={(v) => router.push(buildDashboardUrl(v))}>
                <SelectTrigger variant="compact" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <ButtonGroup
            variant="nav"
            orientation="vertical"
            collapse="never"
            activeId={activeItem}
            items={navItems}
          />
        </div>
      </nav>

      <div style={{ padding: "0 20px" }}>
        <div
          style={{
            padding: "16px 0",
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <HardDrive size={14} style={{ color: "var(--text-tertiary)" }} />
            <span style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--text-secondary)" }}>
              {t("sidebar.storage")}
            </span>
          </div>
          <ProgressBar value={usedPercentage / 100} color="var(--accent-purple)" height={4} />
          <p style={{ fontSize: "0.7rem", color: "var(--text-tertiary)", marginTop: 4 }}>
            {t("sidebar.storageUsed", {
              used: formatSize(storageUsed),
              limit: formatSize(storageLimit),
            })}
          </p>

          {androidApkUrl && (
            <a
              href={androidApkUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 12,
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid var(--border-subtle)",
                color: "var(--text-secondary)",
                fontSize: "0.75rem",
                fontWeight: 500,
                textDecoration: "none",
                transition: "background 0.15s, border-color 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg-tertiary)";
                e.currentTarget.style.borderColor = "var(--accent-purple)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "var(--border-subtle)";
              }}
            >
              <Smartphone size={14} style={{ color: "var(--accent-purple)" }} />
              {t("sidebar.downloadAndroid")}
            </a>
          )}
        </div>
      </div>
    </aside>
  );
}
