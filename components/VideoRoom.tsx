"use client";

import {
	ControlBar,
	GridLayout,
	LiveKitRoom,
	ParticipantTile,
	RoomAudioRenderer,
	useLocalParticipant,
	useParticipants,
	useTracks,
} from "@livekit/components-react";
import { type DisconnectReason, Track } from "livekit-client";
import { useEffect, useState } from "react";
import "@livekit/components-styles";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { roomApi } from "@/lib/api-client";
import { useRoomStore } from "@/stores/room-store";
import type { Role } from "@/types/room";
import { isModerator as isModeratorRole, parseRoleFromMetadata } from "@/types/room";
import { AppHeader } from "./AppHeader";
import { AudioEditor } from "./audio-editor/audio-editor";
import Sidebar from "./Sidebar";
import { useToast } from "./Toast";

interface VideoRoomProps {
	token: string;
	livekitUrl: string;
	roomKey: string;
	participantName: string;
	role: Role;
	onLeave: () => void;
	onDisconnected: (reason?: DisconnectReason) => void;
}

function RoomContent({
	roomKey,
	participantName,
	role,
	onLeave,
}: Omit<VideoRoomProps, "token" | "livekitUrl" | "onDisconnected">) {
	const participants = useParticipants();
	const { localParticipant } = useLocalParticipant();
	const tracks = useTracks(
		[
			{ source: Track.Source.Camera, withPlaceholder: true },
			{ source: Track.Source.ScreenShare, withPlaceholder: false },
		],
		{ onlySubscribed: false },
	);
	const { sidebarOpen, setSidebarOpen, activeTab, setActiveTab, initialize, setRole, setRoomMode } =
		useRoomStore();
	const [roomDescription, setRoomDescription] = useState("");
	const recorder = useAudioRecorder();
	const toast = useToast();

	const copyRoomLink = () => {
		const url = `${window.location.origin}/lobby?key=${roomKey}`;
		navigator.clipboard.writeText(url);
		toast.success("Room link copied to clipboard");
	};

	const currentRole: Role = parseRoleFromMetadata(localParticipant.metadata) || role;
	const isModerator = isModeratorRole(currentRole);

	useEffect(() => {
		initialize(roomKey, participantName, role);
	}, [roomKey, participantName, role, initialize]);

	useEffect(() => {
		setRole(currentRole);
	}, [currentRole, setRole]);

	const fetchRoomInfo = async () => {
		try {
			const data = await roomApi.getInfo({ roomKey, participantName });
			setRoomMode(data.mode);
		} catch {
			// ignore
		}
	};

	useEffect(() => {
		if (isModerator) {
			fetchRoomInfo();
		}
	}, [fetchRoomInfo, isModerator]);

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
				roomKey={roomKey}
				roomDescription={roomDescription}
				onRoomDescriptionChange={setRoomDescription}
				isRecording={recorder.status !== "idle"}
				participantName={participantName}
				participantRole={currentRole}
				canEditDescription={isModerator}
				sidebarOpen={sidebarOpen}
				onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
				onLeave={onLeave}
				onCopyLink={copyRoomLink}
			/>

			<div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
				<PanelGroup orientation="vertical">
					<Panel defaultSize="60%" minSize="20%">
						<div
							style={{
								height: "100%",
								display: "flex",
								flexDirection: "column",
								overflow: "hidden",
							}}
						>
							<div style={{ flex: 1, overflow: "hidden" }}>
								<GridLayout tracks={tracks} style={{ height: "100%" }}>
									<ParticipantTile />
								</GridLayout>
							</div>
							<ControlBar controls={{ leave: false }} />
						</div>
					</Panel>

					<PanelResizeHandle
						style={{
							height: 6,
							background: "var(--border-subtle)",
							cursor: "row-resize",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						<div
							style={{
								width: 40,
								height: 3,
								borderRadius: 2,
								background: "var(--text-tertiary)",
							}}
						/>
					</PanelResizeHandle>

					<Panel defaultSize="40%" minSize="10%">
						<AudioEditor />
					</Panel>
				</PanelGroup>
			</div>

			<Sidebar
				recorder={recorder}
				participants={participants}
				onClose={() => setSidebarOpen(false)}
				activeTab={activeTab}
				onTabChange={setActiveTab}
				isOpen={sidebarOpen}
			/>
			<RoomAudioRenderer />
		</div>
	);
}

export default function VideoRoom(props: VideoRoomProps) {
	return (
		<LiveKitRoom
			token={props.token}
			serverUrl={props.livekitUrl}
			connect={true}
			style={{ height: "100%" }}
			onDisconnected={(reason?: DisconnectReason) => props.onDisconnected(reason)}
		>
			<RoomContent {...props} />
		</LiveKitRoom>
	);
}
