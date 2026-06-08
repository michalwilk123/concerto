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
  const content = (
    <>
      {icon ? <div style={{ flexShrink: 0 }}>{icon}</div> : null}
      <div style={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body" weight={500} truncate>
          {title}
        </Typography>
        {subtitle ? (
          <Typography variant="meta" tone="tertiary" truncate style={{ marginTop: 2 }}>
            {subtitle}
          </Typography>
        ) : null}
      </div>
      {actions ? <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>{actions}</div> : null}
    </>
  );

  const rowStyle: CSSProperties = {
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
  };

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        style={{
          appearance: "none",
          width: "100%",
          color: "inherit",
          font: "inherit",
          textAlign: "left",
          ...rowStyle,
        }}
      >
        {content}
      </button>
    );
  }

  return <div style={rowStyle}>{content}</div>;
}

export function EntityGridRow({ columns, isLast = false, children, style }: EntityGridRowProps) {
  return (
    <div
      data-entity-grid-row="true"
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
