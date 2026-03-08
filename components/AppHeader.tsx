"use client";

import { useEffect, useState } from "react";
import { Globe, Link as LinkIcon, PanelRightClose, PanelRightOpen } from "lucide-react";
import { useRouter, Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/icon-button";
import { InlineButton } from "@/components/ui/inline-button";
import { TextInput } from "@/components/ui/text-input";
import { signOut, useSession } from "@/lib/auth-client";
import { useTranslation } from "@/hooks/useTranslation";
import type { Role } from "@/types/room";
import ConcertoLogo from "./ConcertoLogo";

function LanguageSelector() {
  const { currentLanguage, setLanguage } = useTranslation();
  const [locales, setLocales] = useState<{ code: string; label: string }[]>([]);

  useEffect(() => {
    fetch("/api/translations/languages")
      .then((r) => r.json())
      .then((data) => {
        if (data.locales) setLocales(data.locales);
      })
      .catch(() => {});
  }, []);

  const options = locales.length > 0 ? locales : [{ code: currentLanguage, label: currentLanguage }];
  const isDisabled = options.length <= 1;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "0 10px",
        height: 36,
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        background: "var(--bg-tertiary)",
      }}
    >
      <Globe size={13} style={{ color: "var(--text-tertiary)", flexShrink: 0, opacity: 0.8 }} />
      <select
        value={currentLanguage}
        onChange={(e) => setLanguage(e.target.value)}
        aria-label="Select language"
        disabled={isDisabled}
        style={{
          height: "100%",
          minWidth: 88,
          border: "none",
          outline: "none",
          background: "transparent",
          color: "var(--text-primary)",
          fontSize: "0.82rem",
          fontWeight: 500,
          cursor: isDisabled ? "default" : "pointer",
          opacity: isDisabled ? 0.65 : 1,
          paddingRight: 4,
        }}
      >
        {options.map((loc) => (
          <option
            key={loc.code}
            value={loc.code}
            style={{
              color: "var(--text-primary)",
              background: "var(--bg-secondary)",
            }}
          >
            {loc.label}
          </option>
        ))}
      </select>
    </div>
  );
}

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
        <Link
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
        </Link>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <LanguageSelector />
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
            <Link
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
            </Link>
            <Link
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
            </Link>
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
      <Link
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
      </Link>

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
            <LinkIcon size={14} />
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
        <Link
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
        </Link>

        <LanguageSelector />
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
