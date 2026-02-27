"use client";

import type { CSSProperties, ReactNode } from "react";
import { LoadingState } from "@/components/ui/loading-state";
import { Typography } from "@/components/ui/typography";

interface DataTableShellProps {
  headers: string[];
  columns: string;
  isLoading: boolean;
  hasRows: boolean;
  emptyState: ReactNode;
  children: ReactNode;
  containerStyle?: CSSProperties;
  loadingPadding?: CSSProperties["padding"];
}

export function DataTableShell({
  headers,
  columns,
  isLoading,
  hasRows,
  emptyState,
  children,
  containerStyle,
  loadingPadding = "48px 0",
}: DataTableShellProps) {
  return (
    <div
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        ...containerStyle,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: columns,
          gap: 0,
          padding: "10px 20px",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-tertiary)",
        }}
      >
        {headers.map((header) => (
          <Typography key={header} variant="overline" tone="tertiary">
            {header}
          </Typography>
        ))}
      </div>

      <LoadingState isLoading={isLoading} size={28} minHeight={0} padding={loadingPadding}>
        {hasRows ? children : emptyState}
      </LoadingState>
    </div>
  );
}
