"use client";

import type { CSSProperties, ReactNode } from "react";
import { Children, isValidElement, useEffect, useRef } from "react";
import { LoadingState } from "@/components/ui/loading-state";
import { Typography } from "@/components/ui/typography";

interface DataTableShellProps {
  name: string;
  headers: ReactNode[];
  headerLabels: string[];
  columns: string;
  minTableWidth: number;
  isLoading: boolean;
  hasRows: boolean;
  emptyState: ReactNode;
  children: ReactNode;
  containerStyle?: CSSProperties;
  loadingPadding?: CSSProperties["padding"];
}

export function DataTableShell({
  name,
  headers,
  headerLabels,
  columns,
  minTableWidth,
  isLoading,
  hasRows,
  emptyState,
  children,
  containerStyle,
  loadingPadding = "48px 0",
}: DataTableShellProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const headerNodes = Children.toArray(headers);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    const tableEl = tableRef.current;
    if (!scrollEl || !tableEl) return;

    const fixedColumnWidth = columns
      .split(/\s+/)
      .map((part) => part.match(/^(\d+(?:\.\d+)?)px$/)?.[1])
      .reduce((sum, value) => sum + (value ? Number(value) : 0), 0);
    const expectedFixedTableWidth = fixedColumnWidth > 0 ? fixedColumnWidth + 40 : null;

    const logLayout = () => {
      const shell = scrollEl.parentElement;
      const scrollRect = scrollEl.getBoundingClientRect();
      const tableRect = tableEl.getBoundingClientRect();
      const headerEl = tableEl.firstElementChild;
      const rowEls = Array.from(tableEl.querySelectorAll("[data-entity-grid-row]"));
      const expectedShouldScroll = scrollRect.width < minTableWidth;
      const actualCanScroll = scrollEl.scrollWidth > scrollEl.clientWidth;
      const headerCells = headerEl ? Array.from(headerEl.children) : [];
      const firstRowCells = rowEls[0] ? Array.from(rowEls[0].children) : [];
      const headerCellIssues = headerCells
        .map((cell, index) => {
          const rect = cell.getBoundingClientRect();
          const visibleWidth = Math.round(rect.width * 100) / 100;
          const overflowPx = Math.max(0, cell.scrollWidth - cell.clientWidth);
          return {
            column: headerLabels[index] ?? `column ${index + 1}`,
            visibleWidth,
            clientWidth: cell.clientWidth,
            scrollWidth: cell.scrollWidth,
            overflowPx,
            text: cell.textContent?.trim() ?? "",
          };
        })
        .filter((cell) => cell.visibleWidth < 1 || cell.clientWidth < 1 || cell.overflowPx > 1);
      const firstRowCellIssues = firstRowCells
        .map((cell, index) => {
          const rect = cell.getBoundingClientRect();
          const visibleWidth = Math.round(rect.width * 100) / 100;
          const overflowPx = Math.max(0, cell.scrollWidth - cell.clientWidth);
          return {
            column: headerLabels[index] ?? `column ${index + 1}`,
            visibleWidth,
            clientWidth: cell.clientWidth,
            scrollWidth: cell.scrollWidth,
            overflowPx,
            text: cell.textContent?.trim().replace(/\s+/g, " ").slice(0, 80) ?? "",
          };
        })
        .filter((cell) => cell.visibleWidth < 1 || cell.clientWidth < 1 || cell.overflowPx > 1);
      const failures = {
        scrollMismatch: expectedShouldScroll !== actualCanScroll,
        tableTooNarrow: tableRect.width + 1 < minTableWidth,
        headerCountMismatch: headerCells.length !== headerLabels.length,
        rowCountMismatch: firstRowCells.length > 0 && firstRowCells.length !== headerLabels.length,
        headerCellIssues,
        firstRowCellIssues,
        configuredEmptySpace:
          expectedFixedTableWidth !== null && minTableWidth - expectedFixedTableWidth > 1,
      };
      const hasFailures =
        failures.scrollMismatch ||
        failures.tableTooNarrow ||
        failures.headerCountMismatch ||
        failures.rowCountMismatch ||
        failures.configuredEmptySpace ||
        headerCellIssues.length > 0 ||
        firstRowCellIssues.length > 0;

      const payload = {
        expected: {
          minTableWidth,
          columns,
          headerLabels,
          fixedColumnWidth,
          expectedFixedTableWidth,
          shouldScroll: expectedShouldScroll,
          minUsableCellWidth: 1,
          maxCellOverflowPx: 1,
          maxConfiguredEmptySpacePx: 1,
        },
        actual: {
          containerClientWidth: scrollEl.clientWidth,
          containerRenderedWidth: Math.round(scrollRect.width),
          containerScrollWidth: scrollEl.scrollWidth,
          shellRenderedWidth: shell ? Math.round(shell.getBoundingClientRect().width) : null,
          shellMaxWidth: shell ? window.getComputedStyle(shell).maxWidth : null,
          shellMarginLeft: shell ? window.getComputedStyle(shell).marginLeft : null,
          shellMarginRight: shell ? window.getComputedStyle(shell).marginRight : null,
          tableRenderedWidth: Math.round(tableRect.width),
          configuredEmptySpacePx:
            expectedFixedTableWidth === null ? null : minTableWidth - expectedFixedTableWidth,
          canScrollHorizontally: actualCanScroll,
          overflowX: window.getComputedStyle(scrollEl).overflowX,
          computedColumns: headerEl ? window.getComputedStyle(headerEl).gridTemplateColumns : null,
          headerCells: headerCells.map((cell, index) => ({
            column: headerLabels[index] ?? `column ${index + 1}`,
            width: Math.round(cell.getBoundingClientRect().width * 100) / 100,
            clientWidth: cell.clientWidth,
            scrollWidth: cell.scrollWidth,
            text: cell.textContent?.trim() ?? "",
          })),
        },
        failures,
      };

      if (hasFailures) {
        console.warn(`[DataTableShell:${name}] table layout issue`, payload);
      } else {
        console.log(`[DataTableShell:${name}] table layout ok`, payload);
      }
    };

    logLayout();
    const resizeObserver = new ResizeObserver(logLayout);
    resizeObserver.observe(scrollEl);
    resizeObserver.observe(tableEl);
    return () => resizeObserver.disconnect();
  }, [columns, headerLabels, minTableWidth, name]);

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
        ref={scrollRef}
        style={{
          overflowX: "auto",
          overflowY: "hidden",
          width: "100%",
        }}
      >
        <div ref={tableRef} style={{ minWidth: minTableWidth, width: "100%" }}>
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
            {headerNodes.map((header, idx) => (
              <Typography
                key={isValidElement(header) && header.key !== null ? header.key : `header-${idx}`}
                variant="overline"
                tone="tertiary"
              >
                {header}
              </Typography>
            ))}
          </div>

          <LoadingState isLoading={isLoading} size={28} minHeight={0} padding={loadingPadding}>
            {hasRows ? children : emptyState}
          </LoadingState>
        </div>
      </div>
    </div>
  );
}
