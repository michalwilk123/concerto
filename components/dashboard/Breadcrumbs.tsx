"use client";

import { useDroppable } from "@dnd-kit/core";
import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { buildDashboardUrl } from "@/lib/dashboard-url";
import { useTranslation } from "@/hooks/useTranslation";
import { logVisualBoolean, logVisualRange } from "@/lib/visual-debug";
import type { FolderDoc } from "@/types/files";

interface BreadcrumbsProps {
  groupId: string;
  ancestors: FolderDoc[];
  compact?: boolean;
  onNavigate?: (folderId: string | null) => void;
}

function DroppableCrumb({
  dropId,
  folderId,
  children,
  href,
  onClick,
  isCurrent,
}: {
  dropId: string;
  folderId: string | null;
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  isCurrent: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: dropId,
    data: { type: "breadcrumb", folderId },
  });

  const style: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 4,
    background: isOver ? "color-mix(in srgb, var(--accent-primary) 12%, transparent)" : "none",
    border: isOver ? "1px solid var(--accent-primary)" : "1px solid transparent",
    padding: "4px 8px",
    color: isCurrent ? "var(--text-primary)" : "var(--text-secondary)",
    cursor: "pointer",
    borderRadius: "var(--radius-sm)",
    fontWeight: 500,
    textDecoration: "none",
    transition: "background 0.1s, border-color 0.1s",
  };

  if (onClick) {
    return (
      <button ref={setNodeRef} type="button" onClick={onClick} style={{ ...style, background: isOver ? "color-mix(in srgb, var(--accent-primary) 12%, transparent)" : "none", border: isOver ? "1px solid var(--accent-primary)" : "1px solid transparent" }}>
        {children}
      </button>
    );
  }

  return (
    <Link ref={setNodeRef} href={href!} style={style}>
      {children}
    </Link>
  );
}

export function Breadcrumbs({ groupId, ancestors, compact = false, onNavigate }: BreadcrumbsProps) {
  const isAtRoot = ancestors.length === 0;
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const logLayout = () => {
      // Container is overflow:hidden; only the last crumb truncates. A long middle
      // crumb overflows and gets silently clipped — measure how many px are hidden.
      const hidden = Math.max(0, container.scrollWidth - container.clientWidth);
      logVisualRange("Breadcrumbs", {
        label: "hidden overflow (clipped px)",
        value: hidden,
        min: 0,
        max: 0,
      }, { crumbCount: ancestors.length + 1, scrollWidth: container.scrollWidth, clientWidth: container.clientWidth });
      logVisualBoolean("Breadcrumbs", "trail clipped", hidden > 1, false, { compact, hidden });
    };

    logLayout();
    const resizeObserver = new ResizeObserver(logLayout);
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [ancestors.length, compact]);

  return (
    <div ref={containerRef} style={{ display: "flex", alignItems: "center", gap: compact ? 4 : 8, fontSize: "0.875rem", minWidth: 0, overflow: "hidden" }}>
      <DroppableCrumb
        dropId="breadcrumb:root"
        folderId={null}
        href={onNavigate ? undefined : buildDashboardUrl(groupId)}
        onClick={onNavigate ? () => onNavigate(null) : undefined}
        isCurrent={isAtRoot}
      >
        <Home size={16} />
        <span>{t("breadcrumbs.myFiles")}</span>
      </DroppableCrumb>

      {ancestors.map((folder, index) => {
        const isLast = index === ancestors.length - 1;

        return (
          <span key={folder.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ChevronRight size={16} style={{ color: "var(--text-tertiary)" }} />
            {isLast ? (
              <span style={{ color: "var(--text-primary)", fontWeight: 500, padding: "4px 8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: compact ? 120 : undefined }}>
                {folder.name}
              </span>
            ) : (
              <DroppableCrumb
                dropId={`breadcrumb:${folder.id}`}
                folderId={folder.id}
                href={onNavigate ? undefined : buildDashboardUrl(groupId, { folderId: folder.id })}
                onClick={onNavigate ? () => onNavigate(folder.id) : undefined}
                isCurrent={false}
              >
                {folder.name}
              </DroppableCrumb>
            )}
          </span>
        );
      })}
    </div>
  );
}
