"use client";

import { useEffect } from "react";
import { usePlayheadAnimation } from "@/hooks/use-playhead-animation";
import { getAudioEngine } from "@/lib/audio";
import { useEditorStore } from "@/stores/editor-store";
import { Timeline } from "./timeline";
import { SoundControls } from "./transport";

// AI: Definitions: Timeline -> upper component with ruler and time, TrackLineComponent -> collection of TrackLines
// TrackLine -> contains Clips, has markings

export function AudioEditor() {
	const {
		tracks,
		selectedClipId,
		removeClip,
		selectClip,
		currentTime,
		isPlaying,
		play,
		pause,
		stop,
	} = useEditorStore();
	const playheadAnimation = usePlayheadAnimation();
	const { getCurrentTime, displayTime, registerPlayhead } = playheadAnimation;

	// Initialize: ensure playback is stopped on mount
	useEffect(() => {
		const currentState = useEditorStore.getState();
		console.log("[AudioEditor] Component mounted", {
			isPlaying: currentState.isPlaying,
			isPaused: currentState.isPaused,
			currentTime: currentState.currentTime,
		});
		console.log("[AudioEditor] Calling stop() to reset state");
		stop();
		console.log("[AudioEditor] After stop(), isPlaying:", useEditorStore.getState().isPlaying);
	}, [stop]);

	// Handle keyboard shortcuts
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Spacebar: Play/Pause
			if (e.key === " " || e.code === "Space") {
				e.preventDefault();
				const audioEngine = getAudioEngine();
				if (isPlaying) {
					audioEngine.pause();
					pause();
				} else {
					const allClips = tracks.flatMap((track) => track.clips);
					// Use current playhead time (not stale Zustand state)
					audioEngine.play(allClips, getCurrentTime());
					play();
				}
			}

			// Delete selected clip
			if ((e.key === "Delete" || e.key === "Backspace") && selectedClipId) {
				removeClip(selectedClipId);
				e.preventDefault();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [selectedClipId, removeClip, tracks, getCurrentTime, isPlaying, play, pause]);

	// Handle click on background to deselect
	const handleBackgroundClick = () => {
		if (selectedClipId) {
			selectClip(null);
		}
	};

	return (
		<div className="h-full flex flex-col bg-background" onClick={handleBackgroundClick}>
			<SoundControls displayTime={displayTime} />

			<Timeline tracks={tracks} registerPlayhead={registerPlayhead} />
		</div>
	);
}
