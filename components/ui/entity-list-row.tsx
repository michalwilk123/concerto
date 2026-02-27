"use client";

import type { CSSProperties, ReactNode } from "react";
import { Typography } from "@/components/ui/typography";

interface EntityListRowProps {
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
}

interface EntityGridRowProps {
  columns: string;
  isLast?: boolean;
  children: ReactNode;
  style?: CSSProperties;
}

export function EntityListRow({
  icon,
  title,
  subtitle,
  actions,
  selected = false,
  onClick,
  style,
}: EntityListRowProps) {
  return (
    <div
      onClick={onClick}
      style={{
        cursor: onClick ? "pointer" : undefined,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        borderRadius: "var(--radius-md)",
        border: `1px solid ${selected ? "var(--accent-purple)" : "var(--border-subtle)"}`,
        background: selected ? "var(--bg-tertiary)" : "var(--bg-secondary)",
        transition: "border-color 0.15s, background 0.15s",
        ...style,
      }}
    >
      {icon ? <div style={{ flexShrink: 0 }}>{icon}</div> : null}
      <div style={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body" weight={500} truncate>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="meta" tone="tertiary" style={{ marginTop: 2 }}>
            {subtitle}
          </Typography>
        ) : null}
      </div>
      {actions ? <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>{actions}</div> : null}
    </div>
  );
}

export function EntityGridRow({ columns, isLast = false, children, style }: EntityGridRowProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: columns,
        gap: 0,
        padding: "12px 20px",
        alignItems: "center",
        borderBottom: isLast ? "none" : "1px solid var(--border-subtle)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
