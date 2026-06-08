"use client";

import { Globe, Link as LinkIcon, PanelRightClose, PanelRightOpen } from "lucide-react";
import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { TextInput } from "@/components/ui/text-input";
import { useTranslation } from "@/hooks/useTranslation";
import { Link } from "@/i18n/navigation";
import { useSession } from "@/lib/auth-client";
import { logoutAndRedirect } from "@/lib/logout";
import { logElementVisuals } from "@/lib/visual-debug";
import type { Role } from "@/types/room";
import ConcertoLogo from "./ConcertoLogo";

function LanguageSelector() {
  const { currentLanguage, setLanguage, availableLanguages } = useTranslation();
  const options =
    availableLanguages.length > 0
      ? availableLanguages
      : [{ code: currentLanguage, label: currentLanguage, isDefault: true }];
  const isDisabled = options.length <= 1;
  const wrapRef = useRef<HTMLDivElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const select = selectRef.current;
    if (!wrap || !select) return;

    const logLayout = () => {
      logElementVisuals("LanguageSelector", "wrapper", wrap, {
        height: { min: 34, max: 38 },
        width: { min: 56, max: 220 },
        childCount: { min: 2, max: 2 },
        shouldOverflowX: false,
        shouldOverflowY: false,
        shouldClipText: false,
      });
      logElementVisuals("LanguageSelector", "native select", select, {
        height: { min: 30, max: 38 },
        width: { min: 40, max: 200 },
        shouldOverflowY: false,
        shouldClipText: false,
      });
    };

    logLayout();
    const resizeObserver = new ResizeObserver(logLayout);
    resizeObserver.observe(wrap);
    resizeObserver.observe(select);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div
      ref={wrapRef}
      className="app-language-selector"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        height: 36,
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        background: "var(--bg-tertiary)",
        flexShrink: 0,
      }}
    >
      <Globe size={13} style={{ color: "var(--text-tertiary)", flexShrink: 0, opacity: 0.8 }} />
      <select
        ref={selectRef}
        className="app-language-select"
        value={currentLanguage}
        onChange={(e) => setLanguage(e.target.value)}
        aria-label="Select language"
        disabled={isDisabled}
        style={{
          height: "100%",
          width: "100%",
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
  const { t } = useTranslation();
  const { data: session, isPending } = useSession();
  const user = session?.user;
  const isAdmin = user?.role === "admin";
  const headerRef = useRef<HTMLElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const authRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const header = headerRef.current;
    const actions = actionsRef.current;
    if (!header || !actions) return;

    const logLayout = () => {
      logElementVisuals("AppHeader", "header", header, {
        height: { min: 54, max: 58 },
        childCount: { min: 2, max: 2 },
        shouldOverflowX: false,
        shouldOverflowY: false,
      });
      logElementVisuals("AppHeader", "actions", actions, {
        height: { min: 32, max: 40 },
        width: { min: 116, max: window.innerWidth },
        shouldOverflowX: false,
        shouldOverflowY: false,
      });
      if (authRef.current) {
        logElementVisuals("AppHeader", "auth buttons", authRef.current, {
          height: { min: 30, max: 34 },
          shouldOverflowX: false,
          shouldOverflowY: false,
        });
      }
    };

    logLayout();
    const resizeObserver = new ResizeObserver(logLayout);
    resizeObserver.observe(header);
    resizeObserver.observe(actions);
    if (authRef.current) resizeObserver.observe(authRef.current);
    return () => resizeObserver.disconnect();
  });

  const handleLogout = async () => {
    await logoutAndRedirect();
  };

  return (
    <header
      ref={headerRef}
      className="app-header"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
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
      <div className="app-header-brand-wrap" style={{ display: "flex", alignItems: "center" }}>
        <Link
          className="app-header-brand"
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
      <div
        ref={actionsRef}
        className="app-header-actions"
        style={{ display: "flex", alignItems: "center" }}
      >
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
            {isAdmin && (
              <Button asChild variant="secondary" size="sm">
                <Link href="/dashboard/manage">{t("common.navigation.manage")}</Link>
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={handleLogout}>
              {t("common.actions.logout")}
            </Button>
          </>
        ) : (
          <ButtonGroup
            ref={authRef}
            className="app-header-auth-buttons"
            size="sm"
            variant="toolbar"
            items={[
              {
                id: "signIn",
                label: t("common.auth.signIn"),
                asChild: true,
                children: (
                  <Link href="/login" style={{ color: "inherit" }}>
                    {t("common.auth.signIn")}
                  </Link>
                ),
              },
              {
                id: "register",
                label: t("common.auth.register"),
                tone: "primary",
                asChild: true,
                children: (
                  <Link href="/register" style={{ color: "inherit" }}>
                    {t("common.auth.register")}
                  </Link>
                ),
              },
            ]}
          />
        )}
      </div>
    </header>
  );
}

function RoomHeader(props: Extract<AppHeaderProps, { mode: "room" }>) {
  const { t } = useTranslation();
  const headerRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    const header = headerRef.current;
    const title = titleRef.current;
    const actions = actionsRef.current;
    if (!header || !title || !actions) return;

    const logLayout = () => {
      logElementVisuals("RoomHeader", "header", header, {
        height: { min: 56, max: 112 },
        childCount: { min: 3, max: 3 },
        shouldOverflowX: false,
        shouldOverflowY: false,
      });
      logElementVisuals("RoomHeader", "title block", title, {
        width: { min: 80, max: window.innerWidth },
        shouldOverflowY: false,
      });
      logElementVisuals("RoomHeader", "actions", actions, {
        height: { min: 32, max: 44 },
        shouldOverflowX: window.innerWidth < 720,
        shouldOverflowY: false,
      });
    };

    logLayout();
    const resizeObserver = new ResizeObserver(logLayout);
    resizeObserver.observe(header);
    resizeObserver.observe(title);
    resizeObserver.observe(actions);
    return () => resizeObserver.disconnect();
  });

  return (
    <header
      ref={headerRef}
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

      <div ref={titleRef} style={{ flex: 1, minWidth: 0 }}>
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
          <Button
            variant="ghost"
            size="sm"
            iconStart={<LinkIcon size={14} />}
            onClick={onCopyLink}
            title={t("common.actions.copyRoomLink")}
          >
            {t("common.actions.copyRoomLink")}
          </Button>
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
        ref={actionsRef}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-sm)",
          flexShrink: 0,
        }}
      >
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard">{t("common.navigation.dashboard")}</Link>
        </Button>

        <LanguageSelector />
        <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
          {participantName}
        </span>
        <RoleBadge role={participantRole} />

        <Button
          className="sidebar-toggle-btn"
          variant="secondary"
          size="sm"
          onClick={onSidebarToggle}
          iconStart={sidebarOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
          title={sidebarOpen ? t("common.actions.closeSidebar") : t("common.actions.openSidebar")}
        >
          {sidebarOpen ? t("common.actions.closeSidebar") : t("common.actions.openSidebar")}
        </Button>
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
