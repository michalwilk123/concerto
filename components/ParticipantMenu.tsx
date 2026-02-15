"use client";

import type { Participant } from "livekit-client";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { InlineButton } from "@/components/ui/inline-button";
import { SectionHeading } from "@/components/ui/section-heading";
import { roomApi } from "@/lib/api-client";
import { useRoomStore } from "@/stores/room-store";
import type { Role } from "@/types/room";
import { isModerator as isModeratorRole, parseRoleFromMetadata } from "@/types/room";
import ConfirmDialog from "./ConfirmDialog";
import ModerationPanel from "./ModerationPanel";
import { useToast } from "./Toast";

interface ParticipantMenuProps {
	participants: Participant[];
}

export default function ParticipantMenu({ participants }: ParticipantMenuProps) {
	const { roomKey, participantName, role } = useRoomStore();
	const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);
	const [showMenu, setShowMenu] = useState(false);
	const [kickTarget, setKickTarget] = useState<string | null>(null);
	const toast = useToast();

	const isModerator = isModeratorRole(role);

	const handleKick = async (targetIdentity: string) => {
		setKickTarget(null);
		try {
			await roomApi.kick({ roomKey, targetIdentity, participantName });
			toast.success(`Kicked ${targetIdentity} from the room`);
			setShowMenu(false);
			setSelectedParticipant(null);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to kick participant");
		}
	};

	const handlePromoteModerator = async (targetIdentity: string) => {
		try {
			await roomApi.promote({ roomKey, targetIdentity, participantName, targetRole: "moderator" });
			toast.success(`Promoted ${targetIdentity} to moderator`);
			setShowMenu(false);
			setSelectedParticipant(null);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to promote participant");
		}
	};

	const handlePromoteStudent = async (targetIdentity: string) => {
		try {
			await roomApi.promote({ roomKey, targetIdentity, participantName, targetRole: "student" });
			toast.success(`Promoted ${targetIdentity} to student`);
			setShowMenu(false);
			setSelectedParticipant(null);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to promote participant");
		}
	};

	const handleDemote = async (targetIdentity: string, targetRole: "student" | "participant") => {
		try {
			await roomApi.demote({ roomKey, targetIdentity, participantName, targetRole });
			const label = targetRole === "participant" ? "guest" : targetRole;
			toast.info(`Demoted ${targetIdentity} to ${label}`);
			setShowMenu(false);
			setSelectedParticipant(null);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to demote participant");
		}
	};

	const getParticipantRole = (participant: Participant): Role => {
		return parseRoleFromMetadata(participant.metadata) || "participant";
	};

	const toggleMenu = (identity: string) => {
		if (selectedParticipant === identity && showMenu) {
			setShowMenu(false);
			setSelectedParticipant(null);
		} else {
			setSelectedParticipant(identity);
			setShowMenu(true);
		}
	};

	const getRoleBadge = (participantRole: string) => {
		switch (participantRole) {
			case "admin":
				return { label: "Admin", bg: "var(--accent-green)" };
			case "moderator":
				return { label: "Mod", bg: "var(--accent-silver)" };
			case "student":
				return { label: "Student", bg: "var(--accent-purple, #8b5cf6)" };
			default:
				return { label: "Guest", bg: "var(--accent-gray)" };
		}
	};

	return (
		<div
			style={{
				flex: 1,
				overflowY: "auto",
				padding: "var(--space-lg)",
			}}
		>
			<div
				style={{
					fontSize: "0.75rem",
					color: "var(--text-tertiary)",
					marginBottom: "var(--space-md)",
					fontWeight: 500,
				}}
			>
				{participants.length} participant{participants.length !== 1 ? "s" : ""} in room
			</div>
			<div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
				{participants.map((participant) => {
					const participantRole = getParticipantRole(participant);
					const badge = getRoleBadge(participantRole);
					const isSelf = participant.identity === participantName;
					const isSelected = selectedParticipant === participant.identity && showMenu;

					return (
						<div key={participant.identity}>
							<button
								onClick={() => !isSelf && toggleMenu(participant.identity)}
								style={{
									width: "100%",
									padding: "var(--space-sm) var(--space-md)",
									background: isSelected ? "var(--bg-elevated)" : "var(--bg-tertiary)",
									border: "none",
									borderRadius: "var(--radius-sm)",
									color: "var(--text-primary)",
									cursor: isSelf ? "default" : "pointer",
									textAlign: "left",
									display: "flex",
									justifyContent: "space-between",
									alignItems: "center",
								}}
							>
								<span style={{ fontSize: "0.875rem" }}>
									{participant.identity}
									{isSelf && (
										<span style={{ color: "var(--text-tertiary)", marginLeft: "var(--space-xs)" }}>
											(you)
										</span>
									)}
								</span>
								<Badge label={badge.label} color={badge.bg} />
							</button>
							{isSelected && !isSelf && (
								<div
									style={{
										marginTop: "var(--space-xs)",
										padding: "var(--space-sm)",
										background: "var(--bg-tertiary)",
										borderRadius: "var(--radius-sm)",
										display: "flex",
										flexDirection: "column",
										gap: "var(--space-xs)",
									}}
								>
									{/* Kick — admin or moderator */}
									{isModerator && participantRole !== "admin" && (
										<InlineButton
											variant="danger"
											size="sm"
											onClick={() => setKickTarget(participant.identity)}
											style={{ borderRadius: "var(--radius-sm)" }}
										>
											Kick
										</InlineButton>
									)}
									{/* Admin: promote to mod (when target is student or guest) */}
									{role === "admin" &&
										(participantRole === "student" || participantRole === "participant") && (
											<InlineButton
												variant="ghost"
												size="sm"
												onClick={() => handlePromoteModerator(participant.identity)}
												style={{
													background: "var(--accent-silver)",
													color: "white",
													borderRadius: "var(--radius-sm)",
												}}
											>
												Promote to Mod
											</InlineButton>
										)}
									{/* Admin: demote from mod */}
									{role === "admin" && participantRole === "moderator" && (
										<InlineButton
											variant="warning"
											size="sm"
											onClick={() => handleDemote(participant.identity, "participant")}
											style={{ borderRadius: "var(--radius-sm)" }}
										>
											Demote from Mod
										</InlineButton>
									)}
									{/* Admin + Moderator: promote to student (when target is guest) */}
									{isModerator && participantRole === "participant" && (
										<InlineButton
											variant="accent"
											size="sm"
											onClick={() => handlePromoteStudent(participant.identity)}
											style={{ borderRadius: "var(--radius-sm)" }}
										>
											Promote to Student
										</InlineButton>
									)}
									{/* Admin + Moderator: demote from student */}
									{isModerator && participantRole === "student" && (
										<InlineButton
											variant="warning"
											size="sm"
											onClick={() => handleDemote(participant.identity, "participant")}
											style={{ borderRadius: "var(--radius-sm)" }}
										>
											Demote from Student
										</InlineButton>
									)}
								</div>
							)}
						</div>
					);
				})}
			</div>

			{/* Waiting Room section — only visible to admin/moderator */}
			{isModerator && (
				<>
					<div
						style={{
							marginTop: "var(--space-xl)",
							paddingTop: "var(--space-md)",
							borderTop: "1px solid var(--border-subtle)",
						}}
					>
						<SectionHeading>Waiting Room</SectionHeading>
					</div>
					<ModerationPanel />
				</>
			)}

			<ConfirmDialog
				open={!!kickTarget}
				title="Kick participant"
				message={`Are you sure you want to remove ${kickTarget} from the room? They will need to rejoin.`}
				confirmLabel="Kick"
				cancelLabel="Cancel"
				variant="danger"
				onConfirm={() => kickTarget && handleKick(kickTarget)}
				onCancel={() => setKickTarget(null)}
			/>
		</div>
	);
}
