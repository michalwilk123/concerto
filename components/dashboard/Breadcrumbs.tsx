"use client";

import { useDroppable } from "@dnd-kit/core";
import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import { buildDashboardUrl } from "@/lib/dashboard-url";
import { useTranslation } from "@/hooks/useTranslation";
import type { FolderDoc } from "@/types/files";

interface BreadcrumbsProps {
  groupId: string;
  ancestors: FolderDoc[];
}

function DroppableCrumb({
  dropId,
  folderId,
  children,
  href,
  isCurrent,
}: {
  dropId: string;
  folderId: string | null;
  children: React.ReactNode;
  href: string;
  isCurrent: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: dropId,
    data: { type: "breadcrumb", folderId },
  });

  return (
    <Link
      ref={setNodeRef}
      href={href}
      style={{
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
      }}
    >
      {children}
    </Link>
  );
}

export function Breadcrumbs({ groupId, ancestors }: BreadcrumbsProps) {
  const isAtRoot = ancestors.length === 0;
  const { t } = useTranslation();

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.875rem" }}>
      <DroppableCrumb
        dropId="breadcrumb:root"
        folderId={null}
        href={buildDashboardUrl(groupId)}
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
              <span style={{ color: "var(--text-primary)", fontWeight: 500, padding: "4px 8px" }}>
                {folder.name}
              </span>
            ) : (
              <DroppableCrumb
                dropId={`breadcrumb:${folder.id}`}
                folderId={folder.id}
                href={buildDashboardUrl(groupId, { folderId: folder.id })}
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
