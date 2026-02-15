"use client";

import { Link, LogOut, PanelRightClose, PanelRightOpen } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/icon-button";
import { InlineButton } from "@/components/ui/inline-button";
import { TextInput } from "@/components/ui/text-input";
import { signOut, useSession } from "@/lib/auth-client";
import type { Role } from "@/types/room";
import ConcertoLogo from "./ConcertoLogo";

type AppHeaderProps =
	| { mode: "app" }
	| {
			mode: "room";
			roomKey: string;
			roomDescription: string;
			onRoomDescriptionChange: (v: string) => void;
			isRecording: boolean;
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
	const pathname = usePathname();
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
					href="/"
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
				{user && (
					<nav style={{ display: "flex", gap: 4 }}>
						<NavLink href="/dashboard" label="Files" active={pathname === "/dashboard"} />
						<NavLink href="/lobby" label="Lobby" active={pathname === "/lobby"} />
					</nav>
				)}
			</div>
			<div style={{ display: "flex", alignItems: "center", gap: 12 }}>
				{isPending ? null : user ? (
					<>
						<span style={{ fontSize: "0.84rem", color: "var(--text-secondary)" }}>{user.name}</span>
						{isAdmin && <RoleBadge role="admin" />}
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
							Logout
						</InlineButton>
					</>
				) : (
					<>
						<span style={{ fontSize: "0.84rem", color: "var(--text-tertiary)" }}>Guest</span>
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
							Sign In
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
							Register
						</a>
					</>
				)}
			</div>
		</header>
	);
}

function RoomHeader(props: Extract<AppHeaderProps, { mode: "room" }>) {
	const {
		roomKey,
		roomDescription,
		onRoomDescriptionChange,
		isRecording,
		participantName,
		participantRole,
		canEditDescription,
		sidebarOpen,
		onSidebarToggle,
		onLeave,
		onCopyLink,
	} = props;

	return (
		<>
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
					href="/lobby"
					title="Return to lobby"
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
					<div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
						<code
							style={{
								margin: 0,
								fontSize: "1.1rem",
								fontWeight: 600,
								fontFamily: "monospace",
								letterSpacing: "0.05em",
								color: "var(--text-primary)",
							}}
						>
							{roomKey}
						</code>
						<IconButton
							variant="square"
							size="xs"
							onClick={onCopyLink}
							title="Copy room link"
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
						{isRecording && (
							<span
								style={{
									width: 8,
									height: 8,
									borderRadius: "50%",
									background: "var(--accent-red)",
									display: "inline-block",
									flexShrink: 0,
									animation: "appheader-pulse 1.5s ease-in-out infinite",
								}}
							/>
						)}
					</div>
					<TextInput
						variant="transparent"
						value={roomDescription}
						onChange={(e) => onRoomDescriptionChange(e.target.value)}
						placeholder={canEditDescription ? "Add a description..." : ""}
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
					style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)", flexShrink: 0 }}
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
						Dashboard
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
						title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
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
						Leave
					</InlineButton>
				</div>
			</header>

			{isRecording && (
				<style>{`
          @keyframes appheader-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
        `}</style>
			)}
		</>
	);
}

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
	return (
		<a
			href={href}
			style={{
				padding: "6px 12px",
				fontSize: "0.84rem",
				fontWeight: 500,
				borderRadius: "var(--radius-md)",
				textDecoration: "none",
				color: active ? "var(--text-primary)" : "var(--text-secondary)",
				background: active ? "var(--bg-tertiary)" : "transparent",
				transition: "background 0.15s, color 0.15s",
			}}
		>
			{label}
		</a>
	);
}

const roleBgMap: Record<Role, string> = {
	admin: "linear-gradient(135deg, #22c55e, #16a34a)",
	moderator: "linear-gradient(135deg, #a8a8a8, #888)",
	student: "linear-gradient(135deg, #a78bfa, #7c3aed)",
	participant: "linear-gradient(135deg, #737373, #525252)",
};

function RoleBadge({ role }: { role: Role }) {
	const label =
		role === "admin"
			? "Admin"
			: role === "moderator"
				? "Moderator"
				: role === "student"
					? "Student"
					: "Participant";

	return <Badge label={label} color={roleBgMap[role]} />;
}
