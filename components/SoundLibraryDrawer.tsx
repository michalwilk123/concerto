"use client";

import { Circle, Mic, Music, Pause, Play, Save, Square, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { InlineButton } from "@/components/ui/inline-button";
import { SectionHeading } from "@/components/ui/section-heading";
import type { UseAudioRecorderReturn } from "@/hooks/useAudioRecorder";
import { formatTime } from "@/lib/audio";
import { useAllSounds, useSoundLibraryStore } from "@/stores/sound-library-store";
import type { SoundFile } from "@/types/editor";
import AudioWaveform from "./AudioWaveform";
import SoundItem from "./SoundItem";

interface SoundLibraryDrawerProps {
	recorder?: UseAudioRecorderReturn;
	canRecord?: boolean;
}

export default function SoundLibraryDrawer({
	recorder,
	canRecord = false,
}: SoundLibraryDrawerProps) {
	const { addSound, addSounds, removeSound, renameSound } = useSoundLibraryStore();
	const allSounds = useAllSounds();
	const [isDragging, setIsDragging] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const syncedCountRef = useRef(0);

	// Sync recordings from the recorder hook into the store
	useEffect(() => {
		if (!recorder) return;
		const recordings = recorder.recordings;
		if (recordings.length > syncedCountRef.current) {
			const newRecordings = recordings.slice(syncedCountRef.current);
			const newSounds: SoundFile[] = newRecordings.map((rec, i) => ({
				id: rec.id,
				name: `Recording ${syncedCountRef.current + i + 1}`,
				path: rec.url,
				source: "recorded" as const,
				duration: rec.duration,
				createdAt: rec.timestamp,
			}));
			addSounds(newSounds);
			syncedCountRef.current = recordings.length;
		}
	}, [recorder?.recordings.length, addSounds, recorder]);

	const handleFiles = (fileList: FileList) => {
		const audioFiles = Array.from(fileList).filter((file) => file.type.startsWith("audio/"));
		const newSounds: SoundFile[] = audioFiles.map((file) => ({
			id: crypto.randomUUID(),
			name: file.name.replace(/\.[^/.]+$/, ""),
			path: URL.createObjectURL(file),
			source: "uploaded" as const,
			createdAt: Date.now(),
		}));
		addSounds(newSounds);
	};

	const handleDragEnter = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(true);
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
	};

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
		if (e.dataTransfer.files.length > 0) {
			handleFiles(e.dataTransfer.files);
		}
	};

	const recordedSounds = allSounds.filter((s) => s.source === "recorded");
	const exportedSounds = allSounds.filter((s) => s.source === "exported");
	const librarySounds = allSounds.filter((s) => s.source !== "recorded" && s.source !== "exported");

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				overflow: "hidden",
				flex: 1,
			}}
		>
			{/* Recording Controls */}
			{canRecord && recorder && (
				<div
					style={{
						padding: "var(--space-lg)",
						borderBottom: "1px solid var(--border-subtle)",
						display: "flex",
						flexDirection: "column",
						gap: "var(--space-md)",
					}}
				>
					{/* Mic selector */}
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
							value={recorder.selectedMicId}
							onChange={(e) => recorder.selectMic(e.target.value)}
							disabled={recorder.status !== "idle"}
							style={{
								width: "100%",
								opacity: recorder.status !== "idle" ? 0.5 : 1,
							}}
						>
							{recorder.availableMics.length === 0 && (
								<option value="">No microphones found</option>
							)}
							{recorder.availableMics.map((mic) => (
								<option key={mic.deviceId} value={mic.deviceId}>
									{mic.label || `Microphone ${mic.deviceId.slice(0, 8)}`}
								</option>
							))}
						</select>
					</div>

					{/* Waveform and timer */}
					{(recorder.status === "recording" || recorder.status === "paused") && (
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								gap: "var(--space-xs)",
							}}
						>
							<AudioWaveform
								analyserNode={recorder.analyserNode}
								isActive={recorder.status === "recording"}
								width={320}
								height={60}
							/>
							<span
								style={{
									fontFamily: "monospace",
									fontSize: "1rem",
									color:
										recorder.status === "recording"
											? "var(--accent-green)"
											: "var(--accent-orange)",
								}}
							>
								{formatTime(recorder.elapsedTime, "mm:ss")}
							</span>
						</div>
					)}

					{/* Record controls */}
					<div style={{ display: "flex", justifyContent: "center", gap: "var(--space-sm)" }}>
						{recorder.status === "idle" && (
							<IconButton
								variant="circle"
								size="lg"
								color="var(--accent-red)"
								onClick={recorder.startRecording}
								title="Start Recording"
								style={{ width: 44, height: 44 }}
							>
								<Circle size={18} fill="white" />
							</IconButton>
						)}
						{recorder.status === "recording" && (
							<>
								<IconButton
									variant="circle"
									size="lg"
									color="var(--accent-orange)"
									onClick={recorder.pauseRecording}
									title="Pause"
									style={{ width: 44, height: 44 }}
								>
									<Pause size={18} />
								</IconButton>
								<IconButton
									variant="circle"
									size="lg"
									color="var(--accent-red)"
									onClick={recorder.stopRecording}
									title="Stop"
									style={{ width: 44, height: 44 }}
								>
									<Square size={16} fill="white" />
								</IconButton>
							</>
						)}
						{recorder.status === "paused" && (
							<>
								<IconButton
									variant="circle"
									size="lg"
									color="var(--accent-green)"
									onClick={recorder.resumeRecording}
									title="Resume"
									style={{ width: 44, height: 44 }}
								>
									<Play size={18} fill="currentColor" style={{ marginLeft: 2 }} />
								</IconButton>
								<IconButton
									variant="circle"
									size="lg"
									color="var(--accent-red)"
									onClick={recorder.stopRecording}
									title="Stop"
									style={{ width: 44, height: 44 }}
								>
									<Square size={16} fill="white" />
								</IconButton>
							</>
						)}
					</div>

					{/* Error display */}
					{recorder.error && (
						<p
							style={{
								color: "var(--accent-red)",
								fontSize: "0.75rem",
								textAlign: "center",
								margin: 0,
							}}
						>
							{recorder.error}
						</p>
					)}
				</div>
			)}

			{/* Scrollable Sound List */}
			<div
				style={{
					flex: 1,
					overflowY: "auto",
					padding: "var(--space-md) var(--space-lg)",
					border: isDragging ? "2px dashed var(--accent-blue)" : "2px dashed transparent",
					transition: "border-color 0.15s ease",
				}}
				onDragEnter={handleDragEnter}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
			>
				{/* Recordings section */}
				{recordedSounds.length > 0 && (
					<>
						<SectionHeading
							icon={<Mic size={11} />}
							count={recordedSounds.length}
							style={{ marginBottom: "var(--space-sm)" }}
						>
							Recordings
						</SectionHeading>
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								gap: "var(--space-xs)",
								marginBottom: "var(--space-lg)",
							}}
						>
							{recordedSounds.map((sound) => (
								<SoundItem
									key={sound.id}
									sound={sound}
									onRename={renameSound}
									onRemove={removeSound}
								/>
							))}
						</div>
					</>
				)}

				{/* Separator */}
				{recordedSounds.length > 0 && (exportedSounds.length > 0 || librarySounds.length > 0) && (
					<div
						style={{
							height: 1,
							background: "var(--border-subtle)",
							margin: `0 0 var(--space-md) 0`,
						}}
					/>
				)}

				{/* Exports section */}
				{exportedSounds.length > 0 && (
					<>
						<SectionHeading
							icon={<Save size={11} />}
							count={exportedSounds.length}
							style={{ marginBottom: "var(--space-sm)" }}
						>
							Exports
						</SectionHeading>
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								gap: "var(--space-xs)",
								marginBottom: "var(--space-lg)",
							}}
						>
							{exportedSounds.map((sound) => (
								<SoundItem
									key={sound.id}
									sound={sound}
									onRename={renameSound}
									onRemove={removeSound}
								/>
							))}
						</div>
					</>
				)}

				{/* Separator between exports and library */}
				{exportedSounds.length > 0 && librarySounds.length > 0 && (
					<div
						style={{
							height: 1,
							background: "var(--border-subtle)",
							margin: `0 0 var(--space-md) 0`,
						}}
					/>
				)}

				{/* Library section */}
				<SectionHeading
					icon={<Music size={11} />}
					count={librarySounds.length}
					style={{ marginBottom: "var(--space-sm)" }}
				>
					Library
				</SectionHeading>

				{librarySounds.length === 0 && recordedSounds.length === 0 ? (
					<div
						style={{
							textAlign: "center",
							padding: "var(--space-2xl)",
							color: "var(--text-tertiary)",
							fontSize: "0.8rem",
						}}
					>
						{canRecord
							? "Record or upload audio files"
							: "Drag audio files here or use the upload button"}
					</div>
				) : (
					<div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
						{librarySounds.map((sound) => (
							<SoundItem
								key={sound.id}
								sound={sound}
								onRename={renameSound}
								onRemove={removeSound}
							/>
						))}
					</div>
				)}

				{isDragging && (
					<div
						style={{
							marginTop: "var(--space-md)",
							padding: "var(--space-md)",
							background: "var(--accent-blue)",
							color: "white",
							borderRadius: "var(--radius-md)",
							textAlign: "center",
							fontSize: "0.8rem",
							opacity: 0.9,
						}}
					>
						Drop audio files here
					</div>
				)}
			</div>

			{/* Upload Button (bottom) */}
			<div
				style={{
					padding: "var(--space-md) var(--space-lg)",
					borderTop: "1px solid var(--border-subtle)",
				}}
			>
				<input
					ref={fileInputRef}
					type="file"
					accept="audio/*"
					multiple
					style={{ display: "none" }}
					onChange={(e) => e.target.files && handleFiles(e.target.files)}
				/>
				<InlineButton
					variant="primary"
					size="sm"
					fullWidth
					onClick={() => fileInputRef.current?.click()}
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						gap: "var(--space-sm)",
					}}
				>
					<Upload size={14} />
					Upload Audio File
				</InlineButton>
			</div>
		</div>
	);
}
