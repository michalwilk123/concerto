"use client";

import { Link, LogOut, PanelRightClose, PanelRightOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/icon-button";
import { InlineButton } from "@/components/ui/inline-button";
import { TextInput } from "@/components/ui/text-input";
import { signOut, useSession } from "@/lib/auth-client";
import { useTranslation } from "@/hooks/useTranslation";
import type { Role } from "@/types/room";
import ConcertoLogo from "./ConcertoLogo";

type AppHeaderProps =
  | { mode: "app" }
  | {
      mode: "room";
      meetingId: string;
      roomDescription: string;
      onRoomDescriptionChange: (v: string) => void;
      onRoomDescriptionBlur: () => void;
      participantName: string;
      participantRole: Role;
      canEditDescription: boolean;
      sidebarOpen: boolean;
      onSidebarToggle: () => void;
      onLeave: () => void;
      onCopyLink: () => void;
    };

export function AppHeader(props: AppHeaderProps) {
  if (props.mode === "room") {
    return <RoomHeader {...props} />;
  }
  return <AppModeHeader />;
}

function AppModeHeader() {
  const router = useRouter();
  const { t } = useTranslation();
  const { data: session, isPending } = useSession();
  const user = session?.user;
  const isAdmin = user?.role === "admin";

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        height: 56,
        background: "rgba(var(--bg-secondary-rgb, 30, 30, 30), 0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border-subtle)",
        position: "sticky",
        top: 0,
        zIndex: 50,
        boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <a
          href="/dashboard"
          style={{
            display: "flex",
            alignItems: "center",
            textDecoration: "none",
            transition: "transform 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.04)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <ConcertoLogo size="sm" />
        </a>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {isPending ? null : user ? (
          <>
            <span style={{ fontSize: "0.84rem", color: "var(--text-secondary)" }}>{user.name}</span>
            {isAdmin && (
              <Badge
                label={t("appHeader.admin")}
                color="linear-gradient(135deg, #22c55e, #16a34a)"
              />
            )}
            <InlineButton
              variant="secondary"
              size="sm"
              onClick={handleLogout}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "6px 12px",
                fontSize: "0.8rem",
                border: "1px solid var(--border-subtle)",
              }}
            >
              {t("appHeader.logout")}
            </InlineButton>
          </>
        ) : (
          <>
            <a
              href="/login"
              style={{
                padding: "6px 12px",
                fontSize: "0.8rem",
                fontWeight: 500,
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                color: "var(--text-secondary)",
                textDecoration: "none",
                transition: "background 0.15s",
              }}
            >
              {t("appHeader.signIn")}
            </a>
            <a
              href="/register"
              style={{
                padding: "6px 12px",
                fontSize: "0.8rem",
                fontWeight: 500,
                background: "var(--accent-purple)",
                border: "none",
                borderRadius: "var(--radius-md)",
                color: "white",
                textDecoration: "none",
                transition: "opacity 0.15s",
              }}
            >
              {t("appHeader.register")}
            </a>
          </>
        )}
      </div>
    </header>
  );
}

function RoomHeader(props: Extract<AppHeaderProps, { mode: "room" }>) {
  const { t } = useTranslation();
  const {
    meetingId,
    roomDescription,
    onRoomDescriptionChange,
    onRoomDescriptionBlur,
    participantName,
    participantRole,
    canEditDescription,
    sidebarOpen,
    onSidebarToggle,
    onLeave,
    onCopyLink,
  } = props;

  return (
    <header
      style={{
        padding: "var(--space-md) var(--space-lg)",
        background: "rgba(var(--bg-secondary-rgb, 30, 30, 30), 0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border-subtle)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "var(--space-lg)",
        flexShrink: 0,
        boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
      }}
    >
      <a
        onClick={(e) => {
          e.preventDefault();
          onLeave();
        }}
        href="/dashboard"
        title={t("appHeader.returnToDashboard")}
        style={{
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
          cursor: "pointer",
          transition: "transform 0.15s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.04)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        <ConcertoLogo size="md" />
      </a>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-sm)",
          }}
        >
          <code
            style={{
              margin: 0,
              fontSize: "1.1rem",
              fontWeight: 600,
              fontFamily: "monospace",
              letterSpacing: "0.05em",
              color: "var(--text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "min(200px, 30vw)",
            }}
          >
            {meetingId}
          </code>
          <IconButton
            variant="square"
            size="xs"
            onClick={onCopyLink}
            title={t("appHeader.copyRoomLink")}
            style={{
              padding: "var(--space-xs)",
              borderRadius: "var(--radius-sm)",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-tertiary)")}
          >
            <Link size={14} />
          </IconButton>
        </div>
        <TextInput
          variant="transparent"
          value={roomDescription}
          onChange={(e) => onRoomDescriptionChange(e.target.value)}
          onBlur={onRoomDescriptionBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
          }}
          placeholder={canEditDescription ? t("appHeader.addDescription") : ""}
          readOnly={!canEditDescription}
          style={{
            marginTop: "var(--space-xs)",
            fontSize: "0.8rem",
            width: "100%",
            maxWidth: 400,
            cursor: canEditDescription ? "text" : "default",
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-sm)",
          flexShrink: 0,
        }}
      >
        <a
          href="/dashboard"
          style={{
            padding: "6px 12px",
            fontSize: "0.84rem",
            fontWeight: 500,
            borderRadius: "var(--radius-md)",
            textDecoration: "none",
            color: "var(--text-secondary)",
            background: "transparent",
            transition: "background 0.15s, color 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--bg-tertiary)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
        >
          {t("appHeader.dashboard")}
        </a>

        <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
          {participantName}
        </span>
        <RoleBadge role={participantRole} />

        <button
          onClick={onSidebarToggle}
          style={{
            padding: "var(--space-sm)",
            background: sidebarOpen ? "var(--bg-elevated)" : "transparent",
            border: sidebarOpen ? "1px solid var(--border-default)" : "1px solid transparent",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-secondary)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "background 0.15s",
          }}
          title={sidebarOpen ? t("appHeader.closeSidebar") : t("appHeader.openSidebar")}
        >
          {sidebarOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
        </button>

        <InlineButton
          variant="ghost"
          size="sm"
          onClick={onLeave}
          style={{
            padding: "var(--space-xs) var(--space-md)",
            border: "1px solid var(--accent-red)",
            borderRadius: "var(--radius-sm)",
            color: "var(--accent-red)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-xs)",
            fontSize: "0.8rem",
            fontWeight: 500,
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.1)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <LogOut size={14} />
          {t("appHeader.leave")}
        </InlineButton>
      </div>
    </header>
  );
}

const roleBgMap: Record<Role, string> = {
  teacher: "linear-gradient(135deg, #22c55e, #16a34a)",
  student: "linear-gradient(135deg, #a78bfa, #7c3aed)",
};

function RoleBadge({ role }: { role: Role }) {
  const { t } = useTranslation();
  const label = role === "teacher" ? t("appHeader.teacher") : t("appHeader.student");
  return <Badge label={label} color={roleBgMap[role]} />;
}
