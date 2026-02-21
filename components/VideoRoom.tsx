"use client";

import { RealtimeKitProvider, useRealtimeKitClient, useRealtimeKitMeeting, useRealtimeKitSelector } from "@cloudflare/realtimekit-react";
import {
	RtkCameraToggle,
	RtkGrid,
	RtkMicToggle,
	RtkParticipantsAudio,
	RtkRecordingIndicator,
	RtkRecordingToggle,
	RtkScreenShareToggle,
} from "@cloudflare/realtimekit-react-ui";
import { useEffect, useRef, useState } from "react";
import { useRoomStore } from "@/stores/room-store";
import type { Role, RoomParticipant } from "@/types/room";
import { isTeacher, presetToRole } from "@/types/room";
import { AppHeader } from "./AppHeader";
import Sidebar from "./Sidebar";
import { useToast } from "./Toast";

interface VideoRoomProps {
	token: string;
	meetingId: string;
	participantName: string;
	role: Role;
	groupId: string;
	meetingFolderId?: string;
	onLeave: () => void;
	onRoomStateChange: (roomState: string) => void;
}

function getErrorMessage(error: unknown): string {
	if (error instanceof Error) return error.message;
	if (typeof error === "string") return error;
	return "Unknown meeting initialization error";
}

function isMissingAudioOutputError(error: unknown): boolean {
	const message = getErrorMessage(error).toLowerCase();
	return (
		message.includes("err1608") ||
		message.includes("localmediahandler") ||
		message.includes("no audio output devices") ||
		message.includes("no speaker")
	);
}

function RoomContent({
	meetingId,
	participantName,
	role,
	groupId,
	meetingFolderId,
	onLeave,
	onRoomStateChange,
	hasAudioOutput,
}: Omit<VideoRoomProps, "token"> & { hasAudioOutput: boolean }) {
	const { meeting } = useRealtimeKitMeeting();
	const roomState = useRealtimeKitSelector((m) => m.self.roomState);
	const selfPresetName = useRealtimeKitSelector((m) => m.self.presetName);
	const joinedParticipants = useRealtimeKitSelector((m) => m.participants.joined.toArray());
	const canRecord = useRealtimeKitSelector((m) => m.self.permissions.canRecord);
	const recordingState = useRealtimeKitSelector((m) => m.recording.recordingState);

	const { sidebarOpen, setSidebarOpen, activeTab, setActiveTab, initialize, setRole } =
		useRoomStore();
	const [roomDescription, setRoomDescription] = useState("");
	const toast = useToast();
	const hasNotifiedRef = useRef(false);
	const lastRecordingStateRef = useRef<string | null>(null);

	const currentRole: Role = presetToRole(selfPresetName) || role;
	const isTeacherRole = isTeacher(currentRole);

	const copyRoomLink = () => {
		const url = `${window.location.origin}/meet/${meetingId}`;
		navigator.clipboard.writeText(url);
		toast.success("Room link copied to clipboard");
	};

	useEffect(() => {
		initialize(meetingId, participantName, role);
	}, [meetingId, participantName, role, initialize]);

	useEffect(() => {
		setRole(currentRole);
	}, [currentRole, setRole]);

	// Watch for kicked/ended/disconnected states
	useEffect(() => {
		if (roomState && roomState !== "init" && roomState !== "joined" && !hasNotifiedRef.current) {
			hasNotifiedRef.current = true;
			onRoomStateChange(roomState);
		}
	}, [roomState, onRoomStateChange]);

	// Build participants list for sidebar
	const sidebarParticipants: RoomParticipant[] = [
		{ id: meeting.self.id, name: participantName, presetName: selfPresetName },
		...joinedParticipants.map((p) => ({
			id: p.id,
			name: p.name,
			presetName: p.presetName,
		})),
	];

	useEffect(() => {
		if (!recordingState) return;
		if (lastRecordingStateRef.current === null) {
			lastRecordingStateRef.current = recordingState;
			return;
		}
		if (lastRecordingStateRef.current === recordingState) return;
		lastRecordingStateRef.current = recordingState;

		if (recordingState === "RECORDING") {
			toast.success("Recording started");
		} else if (recordingState === "PAUSED") {
			toast.warning("Recording paused");
		} else if (recordingState === "IDLE") {
			toast.info("Recording stopped");
		}
	}, [recordingState, toast]);

	return (
		<div
			style={{
				height: "100vh",
				display: "flex",
				flexDirection: "column",
				background: "var(--bg-primary)",
			}}
		>
			<AppHeader
				mode="room"
				meetingId={meetingId}
				roomDescription={roomDescription}
				onRoomDescriptionChange={setRoomDescription}
				participantName={participantName}
				participantRole={currentRole}
				canEditDescription={isTeacherRole}
				sidebarOpen={sidebarOpen}
				onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
				onLeave={onLeave}
				onCopyLink={copyRoomLink}
			/>

			<div
				style={{
					flex: 1,
					display: "flex",
					flexDirection: "column",
					overflow: "hidden",
				}}
			>
				<div style={{ flex: 1, overflow: "hidden" }}>
					<div style={{ position: "relative", height: "100%", width: "100%" }}>
						<RtkGrid meeting={meeting} style={{ height: "100%", width: "100%" }} />
						<div
							style={{
								position: "absolute",
								top: 12,
								right: 12,
								display: "flex",
								alignItems: "center",
								gap: 8,
								zIndex: 10,
							}}
						>
							<RtkRecordingIndicator meeting={meeting} />
							{canRecord ? (
								<RtkRecordingToggle
									meeting={meeting}
									onRtkApiError={(event) => {
										const detail = event?.detail;
										const message = detail?.message || "Failed to change recording state";
										toast.error(message);
									}}
								/>
							) : null}
						</div>
					</div>
				</div>
				<div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, padding: "12px 0", background: "var(--bg-secondary)" }}>
					<RtkMicToggle meeting={meeting} size="md" />
					<RtkCameraToggle meeting={meeting} size="md" />
					<RtkScreenShareToggle meeting={meeting} size="md" />
					<button
						type="button"
						onClick={() => {
							meeting.leaveRoom();
							onLeave();
						}}
						style={{
							background: "#e53935",
							color: "white",
							border: "none",
							borderRadius: 8,
							padding: "8px 16px",
							cursor: "pointer",
							fontSize: "0.875rem",
							fontWeight: 500,
						}}
					>
						Leave
					</button>
				</div>
			</div>

			<Sidebar
				participants={sidebarParticipants}
				groupId={groupId}
				meetingFolderId={meetingFolderId}
				onClose={() => setSidebarOpen(false)}
				activeTab={activeTab}
				onTabChange={setActiveTab}
				isOpen={sidebarOpen}
			/>
			{hasAudioOutput ? <RtkParticipantsAudio meeting={meeting} /> : null}
		</div>
	);
}

export default function VideoRoom(props: VideoRoomProps) {
	const [meeting, initMeeting] = useRealtimeKitClient();
	const [hasAudioOutput, setHasAudioOutput] = useState(true);
	const toast = useToast();

	useEffect(() => {
		if (!meeting) {
			let cancelled = false;
			const run = async () => {
				try {
					await initMeeting({
						authToken: props.token,
						defaults: {
							audio: true,
							video: true,
						},
					});
				} catch (error) {
					if (cancelled) return;
					if (isMissingAudioOutputError(error)) {
						setHasAudioOutput(false);
						toast.warning("No speaker detected. Joined without participant audio playback.");
						await initMeeting({
							authToken: props.token,
							defaults: {
								audio: false,
								video: true,
							},
						}).catch((retryError) => {
							console.error("RealtimeKit retry init failed:", retryError);
							toast.error(getErrorMessage(retryError));
						});
						return;
					}

					console.error("RealtimeKit init failed:", error);
					toast.error(getErrorMessage(error));
				}
			};
			run();
			return () => {
				cancelled = true;
			};
		}
	}, [meeting, initMeeting, props.token]);

	useEffect(() => {
		if (meeting) {
			meeting.joinRoom();
		}
	}, [meeting]);

	return (
		<RealtimeKitProvider value={meeting} fallback={<div style={{ height: "100%", display: "flex", justifyContent: "center", alignItems: "center", background: "var(--bg-primary)", color: "var(--text-secondary)" }}>Connecting...</div>}>
			<RoomContent {...props} hasAudioOutput={hasAudioOutput} />
		</RealtimeKitProvider>
	);
}
