"use client";

import { GripVertical, Mic, Music, Pause, Play, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatTime } from "@/lib/audio";
import { useRoomStore } from "@/stores/room-store";
import type { SoundFile } from "@/types/editor";

// Module-level singleton to stop other sounds when one plays
let currentlyPlayingAudio: HTMLAudioElement | null = null;

interface SoundItemProps {
	sound: SoundFile;
	onRename: (id: string, newName: string) => void;
	onRemove: (id: string) => void;
}

export default function SoundItem({ sound, onRename, onRemove }: SoundItemProps) {
	const audioRef = useRef<HTMLAudioElement>(null);
	const [playing, setPlaying] = useState(false);
	const [progress, setProgress] = useState(0);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(sound.duration ?? 0);
	const [isEditing, setIsEditing] = useState(false);
	const [editName, setEditName] = useState(sound.name);
	const inputRef = useRef<HTMLInputElement>(null);

	const effectiveDuration = duration > 0 && Number.isFinite(duration) ? duration : 0;

	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) return;

		const onTimeUpdate = () => {
			setCurrentTime(audio.currentTime);
			const dur = audio.duration > 0 && Number.isFinite(audio.duration) ? audio.duration : 0;
			if (dur > 0) setProgress(audio.currentTime / dur);
		};
		const onLoadedMetadata = () => {
			if (audio.duration > 0 && Number.isFinite(audio.duration)) {
				setDuration(audio.duration);
			} else {
				// Trick for blob URLs that don't report duration immediately
				audio.currentTime = 1e10;
			}
		};
		const onDurationChange = () => {
			if (audio.duration > 0 && Number.isFinite(audio.duration)) {
				setDuration(audio.duration);
				if (!playing) audio.currentTime = 0;
			}
		};
		const onEnded = () => {
			setPlaying(false);
			setProgress(0);
			setCurrentTime(0);
			currentlyPlayingAudio = null;
		};

		audio.addEventListener("timeupdate", onTimeUpdate);
		audio.addEventListener("loadedmetadata", onLoadedMetadata);
		audio.addEventListener("durationchange", onDurationChange);
		audio.addEventListener("ended", onEnded);
		return () => {
			audio.removeEventListener("timeupdate", onTimeUpdate);
			audio.removeEventListener("loadedmetadata", onLoadedMetadata);
			audio.removeEventListener("durationchange", onDurationChange);
			audio.removeEventListener("ended", onEnded);
		};
	}, [playing]);

	// Stop playing if this audio element is not the current one
	useEffect(() => {
		return () => {
			if (currentlyPlayingAudio === audioRef.current) {
				currentlyPlayingAudio = null;
			}
		};
	}, []);

	const togglePlay = useCallback(() => {
		const audio = audioRef.current;
		if (!audio) return;
		if (playing) {
			audio.pause();
			setPlaying(false);
			currentlyPlayingAudio = null;
		} else {
			// Stop any other playing audio
			if (currentlyPlayingAudio && currentlyPlayingAudio !== audio) {
				currentlyPlayingAudio.pause();
				currentlyPlayingAudio.currentTime = 0;
			}
			audio.play().catch(() => {});
			setPlaying(true);
			currentlyPlayingAudio = audio;
		}
	}, [playing]);

	const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
		const audio = audioRef.current;
		if (!audio || effectiveDuration <= 0) return;
		const rect = e.currentTarget.getBoundingClientRect();
		const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
		audio.currentTime = ratio * effectiveDuration;
		setProgress(ratio);
		setCurrentTime(ratio * effectiveDuration);
	};

	const handleDragStart = (e: React.DragEvent) => {
		e.dataTransfer.effectAllowed = "copy";
		e.dataTransfer.setData(
			"application/json",
			JSON.stringify({ name: sound.name, path: sound.path }),
		);
		// Close sidebar to reveal audio editor drop targets
		useRoomStore.getState().setSidebarOpen(false);
	};

	const startEditing = () => {
		setEditName(sound.name);
		setIsEditing(true);
	};

	useEffect(() => {
		if (isEditing && inputRef.current) {
			inputRef.current.focus();
			inputRef.current.select();
		}
	}, [isEditing]);

	const commitRename = () => {
		const trimmed = editName.trim();
		if (trimmed && trimmed !== sound.name) {
			onRename(sound.id, trimmed);
		}
		setIsEditing(false);
	};

	const cancelRename = () => {
		setEditName(sound.name);
		setIsEditing(false);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			e.preventDefault();
			commitRename();
		} else if (e.key === "Escape") {
			e.preventDefault();
			cancelRename();
		}
	};

	const isRecorded = sound.source === "recorded";
	const isExported = sound.source === "exported";
	const SourceIcon = isExported ? Save : isRecorded ? Mic : Music;
	const accentColor = isExported
		? "var(--accent-green)"
		: isRecorded
			? "var(--accent-red)"
			: "var(--accent-blue)";

	return (
		<div
			draggable={!isEditing}
			onDragStart={handleDragStart}
			style={{
				background: "var(--bg-tertiary)",
				borderRadius: "var(--radius-md)",
				padding: "10px 12px",
				display: "flex",
				flexDirection: "column",
				gap: 6,
				cursor: isEditing ? "default" : "grab",
				transition: "background-color 0.15s ease",
				borderLeft: `3px solid ${accentColor}`,
			}}
			onMouseEnter={(e) => {
				if (!isEditing) e.currentTarget.style.backgroundColor = "var(--bg-elevated)";
			}}
			onMouseLeave={(e) => {
				e.currentTarget.style.backgroundColor = "var(--bg-tertiary)";
			}}
		>
			<audio ref={audioRef} src={sound.path} preload="metadata" />

			{/* Top row: play, icon, name, delete */}
			<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
				<IconButton
					variant="circle"
					size="sm"
					color="var(--accent-green)"
					onClick={togglePlay}
					title={playing ? "Pause" : "Play"}
				>
					{playing ? (
						<Pause size={12} />
					) : (
						<Play size={12} fill="currentColor" style={{ marginLeft: 1 }} />
					)}
				</IconButton>

				<SourceIcon size={14} style={{ color: accentColor, flexShrink: 0, opacity: 0.7 }} />

				{isEditing ? (
					<input
						ref={inputRef}
						value={editName}
						onChange={(e) => setEditName(e.target.value)}
						onBlur={commitRename}
						onKeyDown={handleKeyDown}
						style={{
							flex: 1,
							fontSize: "0.8rem",
							background: "var(--bg-primary)",
							border: "1px solid var(--border-default)",
							borderRadius: "var(--radius-sm)",
							color: "var(--text-primary)",
							padding: "2px 6px",
							outline: "none",
							minWidth: 0,
						}}
					/>
				) : (
					<span
						onDoubleClick={startEditing}
						style={{
							fontSize: "0.8rem",
							color: "var(--text-primary)",
							overflow: "hidden",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap",
							flex: 1,
							cursor: "text",
							userSelect: "none",
						}}
						title="Double-click to rename"
					>
						{sound.name}
					</span>
				)}

				<IconButton
					variant="square"
					size="xs"
					onClick={() => onRemove(sound.id)}
					title="Remove sound"
					style={{ transition: "color 0.15s ease, background-color 0.15s ease" }}
					onMouseEnter={(e) => {
						e.currentTarget.style.color = "var(--accent-red)";
						e.currentTarget.style.backgroundColor = "var(--bg-primary)";
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.color = "var(--text-tertiary)";
						e.currentTarget.style.backgroundColor = "transparent";
					}}
				>
					<Trash2 size={13} />
				</IconButton>

				<GripVertical
					size={14}
					style={{ color: "var(--text-tertiary)", flexShrink: 0, opacity: 0.4 }}
				/>
			</div>

			{/* Bottom row: seek bar + time */}
			<div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 36 }}>
				<div onClick={handleSeek} style={{ flex: 1, cursor: "pointer" }}>
					<ProgressBar value={progress} color="var(--accent-green)" height={6} animate={!playing} />
				</div>
				<span
					style={{
						fontSize: "0.65rem",
						color: "var(--text-tertiary)",
						flexShrink: 0,
						fontFamily: "monospace",
						minWidth: 70,
						textAlign: "right",
					}}
				>
					{formatTime(currentTime, "m:ss")} /{" "}
					{effectiveDuration > 0 ? formatTime(effectiveDuration, "m:ss") : "—:——"}
				</span>
			</div>
		</div>
	);
}
