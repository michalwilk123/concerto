"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ButtonGroup } from "@/components/ui/button-group";
import { IconButton } from "@/components/ui/icon-button";
import { useTranslation } from "@/hooks/useTranslation";
import { logVisualBoolean, logVisualRange } from "@/lib/visual-debug";

const MIN_WIDTH = 280;
const MAX_WIDTH = 560;
const DEFAULT_WIDTH = 360;

export interface SidebarTabConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface ResizableSidebarProps {
  tabs: SidebarTabConfig[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  onClose: () => void;
  children: React.ReactNode;
  storageKey?: string;
}

export function ResizableSidebar({
  tabs,
  activeTab,
  onTabChange,
  onClose,
  children,
  storageKey = "sidebar-width",
}: ResizableSidebarProps) {
  const { t } = useTranslation();
  const [width, setWidth] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_WIDTH;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!Number.isNaN(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) return parsed;
    }
    return DEFAULT_WIDTH;
  });
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    const logLayout = () => {
      const rendered = sidebar.getBoundingClientRect().width;
      // State width must stay inside the configured clamp range.
      logVisualRange("ResizableSidebar", {
        label: "state width",
        value: width,
        min: MIN_WIDTH,
        max: MAX_WIDTH,
      });
      // Rendered width should match state width (flexShrink:0 means it shouldn't shrink).
      logVisualRange("ResizableSidebar", {
        label: "rendered width",
        value: rendered,
        min: MIN_WIDTH - 1,
        max: MAX_WIDTH + 1,
      });
      // On a viewport narrower than the sidebar, flexShrink:0 forces overflow.
      logVisualBoolean(
        "ResizableSidebar",
        "wider than viewport (forces horizontal overflow)",
        rendered > window.innerWidth,
        false,
        { rendered, viewport: window.innerWidth },
      );
    };

    logLayout();
    const resizeObserver = new ResizeObserver(logLayout);
    resizeObserver.observe(sidebar);
    window.addEventListener("resize", logLayout);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", logLayout);
    };
  }, [width]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;
      startX.current = e.clientX;
      startWidth.current = width;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [width],
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = startX.current - e.clientX;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      localStorage.setItem(storageKey, String(width));
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [storageKey, width]);

  // Save width on change (debounced by mouseup above, but also on unmount)
  useEffect(() => {
    return () => {
      localStorage.setItem(storageKey, String(width));
    };
  }, [storageKey, width]);

  return (
    <div
      ref={sidebarRef}
      className="meeting-sidebar"
      style={{
        width,
        flexShrink: 0,
        borderLeft: "1px solid var(--border-subtle)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "var(--bg-secondary)",
        position: "relative",
      }}
    >
      {/* Drag handle */}
      <div
        className="sidebar-drag-handle"
        role="separator"
        aria-orientation="vertical"
        onMouseDown={handleMouseDown}
        style={{
          position: "absolute",
          top: 0,
          left: -2,
          bottom: 0,
          width: 5,
          cursor: "col-resize",
          zIndex: 10,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--accent-purple)";
          e.currentTarget.style.opacity = "0.5";
        }}
        onMouseLeave={(e) => {
          if (!isDragging.current) {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.opacity = "1";
          }
        }}
      />

      {/* Tab bar */}
      <div
        style={{
          position: "relative",
        }}
      >
        <ButtonGroup
          variant="segmented"
          grow
          items={tabs}
          activeId={activeTab}
          onSelect={onTabChange}
          className="rounded-none border-x-0 border-t-0 pr-10"
        />
        <IconButton
          variant="square"
          size="sm"
          onClick={onClose}
          title={t("sidebar.close")}
          className="absolute right-1.5 top-1.5"
        >
          <X size={16} />
        </IconButton>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}
