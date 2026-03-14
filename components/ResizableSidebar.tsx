"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { useTranslation } from "@/hooks/useTranslation";

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
      if (!isNaN(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) return parsed;
    }
    return DEFAULT_WIDTH;
  });
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [width]);

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
          (e.currentTarget.style.background = "var(--accent-purple)");
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
          display: "flex",
          alignItems: "center",
          borderBottom: "1px solid var(--border-subtle)",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", flex: 1, overflow: "hidden", paddingRight: 40 }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "var(--space-xs)",
                padding: "var(--space-md) var(--space-sm)",
                background: "transparent",
                border: "none",
                borderBottom:
                  activeTab === tab.id
                    ? "2px solid var(--text-primary)"
                    : "2px solid transparent",
                borderRadius: 0,
                color: activeTab === tab.id ? "var(--text-primary)" : "var(--text-secondary)",
                fontSize: "0.82rem",
                fontWeight: activeTab === tab.id ? 600 : 400,
                cursor: "pointer",
                transition: "color 0.15s ease, border-color 0.15s ease",
                whiteSpace: "nowrap",
                position: "relative",
              }}
            >
              {tab.icon}
              {tab.label}
              {tab.badge != null && tab.badge > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 4,
                    background: "var(--accent-purple)",
                    color: "#fff",
                    borderRadius: "50%",
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    minWidth: 16,
                    height: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 3px",
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
        <IconButton
          variant="square"
          size="sm"
          onClick={onClose}
          title={t("sidebar.close")}
          style={{
            borderRadius: "var(--radius-sm)",
            position: "absolute",
            top: 6,
            right: 6,
          }}
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
