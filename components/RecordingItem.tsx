"use client";

import { Pause, Play, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { Recording } from "@/hooks/useAudioRecorder";
import { formatTime } from "@/lib/audio";

interface RecordingItemProps {
	recording: Recording;
	onDelete?: (id: string) => void;
}

export default function RecordingItem({ recording, onDelete }: RecordingItemProps) {
	const audioRef = useRef<HTMLAudioElement>(null);
	const [playing, setPlaying] = useState(false);
	const [progress, setProgress] = useState(0);
	const [currentTime, setCurrentTime] = useState(0);
	const [audioDuration, setAudioDuration] = useState(0);

	const effectiveDuration =
		audioDuration > 0 && Number.isFinite(audioDuration) ? audioDuration : recording.duration || 0;

	useEffect(() => {
		const audio = audioRef.current;
		if (!audio) return;

		const onTimeUpdate = () => {
			setCurrentTime(audio.currentTime);
			const dur =
				audio.duration > 0 && Number.isFinite(audio.duration)
					? audio.duration
					: recording.duration || 0;
			if (dur > 0) setProgress(audio.currentTime / dur);
		};
		const onLoadedMetadata = () => {
			if (audio.duration > 0 && Number.isFinite(audio.duration)) {
				setAudioDuration(audio.duration);
			} else {
				audio.currentTime = 1e10;
			}
		};
		const onDurationChange = () => {
			if (audio.duration > 0 && Number.isFinite(audio.duration)) {
				setAudioDuration(audio.duration);
				if (!playing) audio.currentTime = 0;
			}
		};
		const onEnded = () => {
			setPlaying(false);
			setProgress(0);
			setCurrentTime(0);
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
	}, [recording.duration, playing]);

	const togglePlay = () => {
		const audio = audioRef.current;
		if (!audio) return;
		if (playing) {
			audio.pause();
			setPlaying(false);
		} else {
			audio.play().catch(() => {});
			setPlaying(true);
		}
	};

	const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
		const audio = audioRef.current;
		if (!audio || effectiveDuration <= 0) return;
		const rect = e.currentTarget.getBoundingClientRect();
		const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
		audio.currentTime = ratio * effectiveDuration;
		setProgress(ratio);
		setCurrentTime(ratio * effectiveDuration);
	};

	return (
		<div
			style={{
				background: "var(--bg-tertiary)",
				borderRadius: "var(--radius-md)",
				padding: "var(--space-md)",
			}}
		>
			<audio ref={audioRef} src={recording.url} preload="metadata" />

			<div style={{ display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
				<IconButton variant="circle" size="md" color="var(--accent-green)" onClick={togglePlay}>
					{playing ? (
						<Pause size={14} />
					) : (
						<Play size={14} fill="currentColor" style={{ marginLeft: 2 }} />
					)}
				</IconButton>

				<div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
					<div onClick={handleSeek} style={{ width: "100%", cursor: "pointer" }}>
						<ProgressBar
							value={progress}
							color="var(--accent-green)"
							height={8}
							animate={!playing}
						/>
					</div>
					<div style={{ display: "flex", justifyContent: "space-between" }}>
						<span style={{ fontSize: "0.7rem", color: "var(--text-tertiary)" }}>
							{formatTime(currentTime, "m:ss")}
						</span>
						<span style={{ fontSize: "0.7rem", color: "var(--text-tertiary)" }}>
							{formatTime(effectiveDuration, "m:ss")}
						</span>
					</div>
				</div>

				{onDelete && (
					<IconButton
						variant="circle"
						size="md"
						onClick={() => onDelete(recording.id)}
						style={{ color: "var(--accent-red)" }}
					>
						<Trash2 size={14} />
					</IconButton>
				)}
			</div>
		</div>
	);
}
