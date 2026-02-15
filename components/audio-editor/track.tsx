"use client";

import { useRef, useState } from "react";
import { loadAudioBuffer } from "@/lib/audio";
import { useEditorStore } from "@/stores/editor-store";
import type { Track as TrackType } from "@/types/editor";
import { Clip } from "./clip";

interface TrackProps {
	track: TrackType;
	pixelsPerSecond: number;
	majorInterval: number;
	minorInterval: number;
}

export function Track({ track, pixelsPerSecond, majorInterval, minorInterval }: TrackProps) {
	const { addClip, resetAllClipModes } = useEditorStore();
	const [isDragOver, setIsDragOver] = useState(false);
	const trackContentRef = useRef<HTMLDivElement>(null);

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragOver(true);
	};

	const handleDragLeave = () => {
		setIsDragOver(false);
	};

	const handleDrop = async (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragOver(false);

		try {
			const data = e.dataTransfer.getData("application/json");
			if (!data) return;

			const soundFile = JSON.parse(data);

			// Load audio buffer
			const audioBuffer = await loadAudioBuffer(soundFile.path);

			// Add clip to track at the start
			addClip(track.id, {
				filename: soundFile.name,
				audioBuffer,
				startTime: 0,
				duration: audioBuffer.duration,
				trimStart: 0,
				trimEnd: 0,
				volume: 1,
				playbackRate: 1,
			});
		} catch (error) {
			console.error("[Track] Failed to load audio:", error);
		}
	};

	const handleTrackClick = (e: React.MouseEvent) => {
		// Only reset if clicking directly on track (not on a clip)
		if (e.target === e.currentTarget || e.target === trackContentRef.current) {
			resetAllClipModes();
		}
	};

	// Calculate grid sizes for vertical lines
	const minorGridSize = minorInterval * pixelsPerSecond;
	const majorGridSize = majorInterval * pixelsPerSecond;

	return (
		<div className="relative border-b-2 border-border/80">
			{/* Track lane with enhanced visual details */}
			<div
				ref={trackContentRef}
				data-track-id={track.id}
				className={`flex-1 relative h-16 transition-all duration-200 overflow-hidden
          ${
						isDragOver
							? "bg-primary/20 border-4 border-primary border-dashed shadow-inner"
							: "bg-background/80 border-l-4 border-muted-foreground/20 hover:bg-muted/30"
					}`}
				style={{
					backgroundImage: `
            repeating-linear-gradient(90deg,
              rgba(255,255,255,0.12) 0px,
              rgba(255,255,255,0.12) 2px,
              transparent 2px,
              transparent ${majorGridSize}px
            ),
            repeating-linear-gradient(90deg,
              rgba(255,255,255,0.06) 0px,
              rgba(255,255,255,0.06) 1px,
              transparent 1px,
              transparent ${minorGridSize}px
            ),
            repeating-linear-gradient(0deg,
              rgba(255,255,255,0.03) 0px,
              rgba(255,255,255,0.03) 1px,
              transparent 1px,
              transparent 12px
            )
          `,
					boxShadow: "inset 0 1px 3px rgba(0,0,0,0.3), inset 0 -1px 2px rgba(255,255,255,0.05)",
				}}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
				onClick={handleTrackClick}
			>
				{/* Top highlight line */}
				<div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent"></div>

				{/* Clips container */}
				<div className="relative h-full">
					{track.clips.map((clip) => (
						<Clip
							key={clip.id}
							clip={clip}
							trackId={track.id}
							pixelsPerSecond={pixelsPerSecond}
							minorInterval={minorInterval}
						/>
					))}
				</div>

				{/* Bottom shadow */}
				<div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
			</div>
		</div>
	);
}
