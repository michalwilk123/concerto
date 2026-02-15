"use client";

import { Circle, Pause, Play, Square } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import type { UseAudioRecorderReturn } from "@/hooks/useAudioRecorder";
import { formatTime } from "@/lib/audio";
import AudioWaveform from "./AudioWaveform";
import RecordingItem from "./RecordingItem";

interface RecordingDrawerProps {
	recorder: UseAudioRecorderReturn;
	canRecord?: boolean;
}

export default function RecordingDrawer({ recorder, canRecord = true }: RecordingDrawerProps) {
	const {
		status,
		recordings,
		availableMics,
		selectedMicId,
		analyserNode,
		elapsedTime,
		error,
		startRecording,
		stopRecording,
		pauseRecording,
		resumeRecording,
		selectMic,
		deleteRecording,
	} = recorder;

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				overflow: "hidden",
				flex: 1,
			}}
		>
			<div
				style={{
					flex: 1,
					overflowY: "auto",
					padding: "var(--space-lg)",
					display: "flex",
					flexDirection: "column",
					gap: "var(--space-lg)",
				}}
			>
				{canRecord && (
					<div>
						<label
							style={{
								fontSize: "0.75rem",
								color: "var(--text-secondary)",
								display: "block",
								marginBottom: "var(--space-xs)",
							}}
						>
							Microphone
						</label>
						<select
							value={selectedMicId}
							onChange={(e) => selectMic(e.target.value)}
							disabled={status !== "idle"}
							style={{
								width: "100%",
								opacity: status !== "idle" ? 0.5 : 1,
							}}
						>
							{availableMics.map((mic) => (
								<option key={mic.deviceId} value={mic.deviceId}>
									{mic.label}
								</option>
							))}
						</select>
					</div>
				)}

				{canRecord && (
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							gap: "var(--space-sm)",
						}}
					>
						<AudioWaveform
							analyserNode={analyserNode}
							isActive={status === "recording"}
							width={320}
							height={72}
						/>
						<span
							style={{
								fontFamily: "monospace",
								fontSize: "1.25rem",
								color:
									status === "recording"
										? "var(--accent-green)"
										: status === "paused"
											? "var(--accent-orange)"
											: "var(--text-tertiary)",
							}}
						>
							{formatTime(elapsedTime, "mm:ss")}
						</span>
					</div>
				)}

				{canRecord && (
					<div style={{ display: "flex", justifyContent: "center", gap: "var(--space-md)" }}>
						{status === "idle" && (
							<IconButton
								variant="circle"
								size="lg"
								color="var(--accent-red)"
								onClick={startRecording}
								title="Start Recording"
							>
								<Circle size={20} fill="white" />
							</IconButton>
						)}
						{status === "recording" && (
							<>
								<IconButton
									variant="circle"
									size="lg"
									color="var(--accent-orange)"
									onClick={pauseRecording}
									title="Pause"
								>
									<Pause size={20} />
								</IconButton>
								<IconButton
									variant="circle"
									size="lg"
									color="var(--accent-red)"
									onClick={stopRecording}
									title="Stop"
								>
									<Square size={18} fill="white" />
								</IconButton>
							</>
						)}
						{status === "paused" && (
							<>
								<IconButton
									variant="circle"
									size="lg"
									color="var(--accent-green)"
									onClick={resumeRecording}
									title="Resume"
								>
									<Play size={20} fill="currentColor" style={{ marginLeft: 2 }} />
								</IconButton>
								<IconButton
									variant="circle"
									size="lg"
									color="var(--accent-red)"
									onClick={stopRecording}
									title="Stop"
								>
									<Square size={18} fill="white" />
								</IconButton>
							</>
						)}
					</div>
				)}

				{error && (
					<p
						style={{
							color: "var(--accent-red)",
							fontSize: "0.75rem",
							textAlign: "center",
							margin: 0,
						}}
					>
						{error}
					</p>
				)}

				{recordings.length > 0 && (
					<div>
						<h4
							style={{
								margin: "0 0 var(--space-sm)",
								fontSize: "0.8rem",
								color: "var(--text-secondary)",
								fontWeight: 500,
							}}
						>
							Recordings ({recordings.length})
						</h4>
						<div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
							{recordings.map((rec) => (
								<RecordingItem
									key={rec.id}
									recording={rec}
									onDelete={canRecord ? deleteRecording : undefined}
								/>
							))}
						</div>
					</div>
				)}

				{recordings.length === 0 && !canRecord && (
					<p
						style={{
							color: "var(--text-tertiary)",
							textAlign: "center",
							margin: "var(--space-2xl) 0",
							fontSize: "0.875rem",
						}}
					>
						No recordings yet
					</p>
				)}
			</div>
		</div>
	);
}
