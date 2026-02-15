"use client";

import { Save, Trash2, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/Toast";
import { Button } from "@/components/ui/button";
import { filesApi, foldersApi } from "@/lib/api-client";
import { exportToWav, formatTime, getAudioEngine } from "@/lib/audio";
import { useEditorStore } from "@/stores/editor-store";
import { useRoomStore } from "@/stores/room-store";
import { useSoundLibraryStore } from "@/stores/sound-library-store";

// Custom SVG icons for transport controls (Audacity-style)
const PlayIcon = () => (
	<svg width="16" height="16" viewBox="0 0 20 20" fill="none">
		<path d="M5 3L17 10L5 17V3Z" fill="#3d9b4f" stroke="#3d9b4f" strokeWidth="0.5" />
	</svg>
);

const PauseIcon = () => (
	<svg width="16" height="16" viewBox="0 0 20 20" fill="none">
		<rect x="5" y="3" width="4" height="14" fill="#d4a017" stroke="#d4a017" strokeWidth="0.5" />
		<rect x="11" y="3" width="4" height="14" fill="#d4a017" stroke="#d4a017" strokeWidth="0.5" />
	</svg>
);

const StopIcon = () => (
	<svg width="16" height="16" viewBox="0 0 20 20" fill="none">
		<rect x="4" y="4" width="12" height="12" fill="#e53935" stroke="#e53935" strokeWidth="0.5" />
	</svg>
);

interface SoundControlsProps {
	displayTime: number;
}

export function SoundControls({ displayTime }: SoundControlsProps) {
	const {
		isPlaying,
		currentTime,
		duration,
		play,
		pause,
		stop,
		setCurrentTime,
		zoom,
		tracks,
		deleteMode,
		toggleDeleteMode,
	} = useEditorStore();

	const { addSound } = useSoundLibraryStore();
	const toast = useToast();

	const audioEngine = getAudioEngine();
	const [isExporting, setIsExporting] = useState(false);

	const handlePlay = () => {
		const allClips = tracks.flatMap((track) => track.clips);
		// Use currentTime from store (displayTime is for display only)
		const startTime = isPlaying ? displayTime : currentTime;
		audioEngine.play(allClips, startTime);
		play();
	};

	const handlePause = () => {
		// Persist the latest playhead time before pausing playback.
		setCurrentTime(displayTime);
		audioEngine.pause();
		pause();
	};

	const handleStop = () => {
		audioEngine.stop();
		stop();
	};

	const handleExport = async () => {
		setIsExporting(true);
		try {
			const blob = await exportToWav(tracks);
			const url = URL.createObjectURL(blob);

			// Generate a name based on timestamp
			const timestamp = new Date()
				.toLocaleString("en-US", {
					month: "short",
					day: "numeric",
					hour: "2-digit",
					minute: "2-digit",
					second: "2-digit",
				})
				.replace(/,/g, "")
				.replace(/:/g, "-");

			const fileName = `Mix ${timestamp}`;

			// Add to sound library instead of downloading
			addSound({
				id: crypto.randomUUID(),
				name: fileName,
				path: url,
				isExported: true,
				source: "exported",
				createdAt: Date.now(),
			});

			// Open sidebar to sounds tab to show the exported mix
			const { setSidebarOpen, setActiveTab } = useRoomStore.getState();
			setSidebarOpen(true);
			setActiveTab("sounds");

			// Also upload to meetings folder for file sharing
			try {
				const wavFile = new File([blob], `${fileName}.wav`, { type: "audio/wav" });
				const meetingsFolder = await foldersApi.findMeetingsFolder();
				if (meetingsFolder) {
					await filesApi.upload({ file: wavFile, folderId: meetingsFolder.id });
				}
			} catch {
				// Don't fail the export if meetings upload fails
			}

			toast.success(`Saved "${fileName}" to sound library`);
		} catch (error) {
			toast.error(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
		} finally {
			setIsExporting(false);
		}
	};

	return (
		<div className="flex items-center gap-2 p-2 border-b bg-background">
			<div className="flex gap-1">
				{!isPlaying ? (
					<button
						onMouseDown={(e) =>
							console.log("[Transport] Play button mouseDown", { timeStamp: e.timeStamp })
						}
						onMouseUp={(e) =>
							console.log("[Transport] Play button mouseUp", { timeStamp: e.timeStamp })
						}
						onClick={(e) => {
							console.log("[Transport] Play button clicked", {
								event: e.type,
								isPlaying,
								timeStamp: e.timeStamp,
							});
							e.stopPropagation();
							handlePlay();
						}}
						className="transport-btn"
						title="Play"
					>
						<PlayIcon />
					</button>
				) : (
					<button
						onMouseDown={(e) =>
							console.log("[Transport] Pause button mouseDown", { timeStamp: e.timeStamp })
						}
						onMouseUp={(e) =>
							console.log("[Transport] Pause button mouseUp", { timeStamp: e.timeStamp })
						}
						onClick={(e) => {
							console.log("[Transport] Pause button clicked", {
								event: e.type,
								isPlaying,
								timeStamp: e.timeStamp,
							});
							e.stopPropagation();
							handlePause();
						}}
						className="transport-btn"
						title="Pause"
					>
						<PauseIcon />
					</button>
				)}
				<button onClick={handleStop} className="transport-btn" title="Stop">
					<StopIcon />
				</button>
			</div>

			<div className="flex-1 text-sm font-mono">
				{formatTime(isPlaying ? displayTime : currentTime)} / {formatTime(duration)}
			</div>

			<div className="flex gap-2">
				<Button
					onClick={handleExport}
					disabled={isExporting}
					size="sm"
					variant="outline"
					title="Save to Sound Library"
				>
					<Save className="w-4 h-4" />
				</Button>
				<Button
					onClick={toggleDeleteMode}
					size="sm"
					variant={deleteMode ? "destructive" : "outline"}
					title={deleteMode ? "Exit Delete Mode" : "Enter Delete Mode"}
				>
					<Trash2 className="w-4 h-4" />
				</Button>
				<Button onClick={() => zoom(0.8)} size="sm" variant="outline">
					<ZoomOut className="w-4 h-4" />
				</Button>
				<Button onClick={() => zoom(1.25)} size="sm" variant="outline">
					<ZoomIn className="w-4 h-4" />
				</Button>
			</div>
		</div>
	);
}
