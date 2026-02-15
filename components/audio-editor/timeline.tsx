"use client";

import { ticks } from "d3-array";
import { Plus } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { formatTime, getGridIntervals } from "@/lib/audio";
import { useEditorStore } from "@/stores/editor-store";
import type { Track as TrackType } from "@/types/editor";
import { Track } from "./track";
import { TrackLabel } from "./track-label";

interface TimelineProps {
	tracks: TrackType[];
	registerPlayhead: (callback: (time: number, pixels: number) => void) => () => void;
}

interface Tick {
	time: number;
	x: number;
	isMajor: boolean;
}

interface TimelineTickProps {
	tick: Tick;
}

function TimelineTick({ tick }: TimelineTickProps) {
	if (tick.isMajor) {
		return (
			<>
				{/* Time label with shadow */}
				<div
					style={{
						position: "absolute",
						left: `${tick.x}px`,
						top: "1px",
						transform: "translateX(-50%)",
						fontSize: "10px",
						fontWeight: 600,
						color: "rgba(200, 200, 200, 0.9)",
						pointerEvents: "none",
						textShadow: "0 1px 2px rgba(0,0,0,0.5)",
					}}
				>
					{formatTime(tick.time)}
				</div>
				{/* Major tick mark - thicker */}
				<div
					style={{
						position: "absolute",
						left: `${tick.x}px`,
						bottom: "0px",
						width: "2px",
						height: "8px",
						background:
							"linear-gradient(to bottom, rgba(156, 163, 175, 0.6), rgba(156, 163, 175, 0.3))",
						pointerEvents: "none",
					}}
				/>
			</>
		);
	}

	// Minor tick - slightly thicker
	return (
		<div
			style={{
				position: "absolute",
				left: `${tick.x}px`,
				bottom: "0px",
				width: "1px",
				height: "4px",
				background:
					"linear-gradient(to bottom, rgba(156, 163, 175, 0.3), rgba(156, 163, 175, 0.1))",
				pointerEvents: "none",
			}}
		/>
	);
}

function generateTicks(
	duration: number,
	pixelsPerSecond: number,
	targetMajorCount: number,
): Tick[] {
	const majorTicks = ticks(0, duration, targetMajorCount);
	const minorTicks = ticks(0, duration, targetMajorCount * 5).filter(
		(t) => !majorTicks.includes(t),
	);

	const tickArray: Tick[] = [
		...majorTicks.map((time) => ({
			time,
			x: time * pixelsPerSecond,
			isMajor: true,
		})),
		...minorTicks.map((time) => ({
			time,
			x: time * pixelsPerSecond,
			isMajor: false,
		})),
	];

	return tickArray.sort((a, b) => a.x - b.x);
}

// Ruler playhead component that updates via direct DOM manipulation (no re-renders)
function RulerPlayhead({
	registerPlayhead,
}: {
	registerPlayhead: (callback: (time: number, pixels: number) => void) => () => void;
}) {
	const playheadRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const cleanup = registerPlayhead((_time, pixels) => {
			if (playheadRef.current) {
				playheadRef.current.style.left = `${pixels}px`;
			}
		});

		return cleanup;
	}, [registerPlayhead]);

	return (
		<div
			ref={playheadRef}
			className="absolute top-0 w-1 bg-gradient-to-b from-red-700 to-red-600 pointer-events-none h-8"
			style={{ left: "0px", transform: "translateX(-50%)" }}
		>
			<div className="w-3 h-3 bg-red-600 rounded-full -translate-x-1/2 border-2 border-red-400/50" />
		</div>
	);
}

// Track playhead component that updates via direct DOM manipulation (no re-renders)
function TrackPlayhead({
	registerPlayhead,
}: {
	registerPlayhead: (callback: (time: number, pixels: number) => void) => () => void;
}) {
	const playheadRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const cleanup = registerPlayhead((_time, pixels) => {
			if (playheadRef.current) {
				playheadRef.current.style.left = `${pixels}px`;
			}
		});

		return cleanup;
	}, [registerPlayhead]);

	return (
		<div
			ref={playheadRef}
			className="absolute top-0 bottom-0 w-1 bg-gradient-to-b from-red-700 via-red-600 to-red-700/80 pointer-events-none"
			style={{ left: "0px", transform: "translateX(-50%)", zIndex: 200 }}
		/>
	);
}

export function Timeline({ tracks, registerPlayhead }: TimelineProps) {
	const { duration, pixelsPerSecond, currentTime, setCurrentTime, isPlaying, addTrack } =
		useEditorStore();
	const rulerRef = useRef<HTMLDivElement>(null);
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const timelineWidth = duration * pixelsPerSecond;

	// Calculate grid intervals
	const { major: majorInterval, minor: minorInterval } = getGridIntervals(
		pixelsPerSecond,
		duration,
	);

	// Calculate target tick count for d3
	const targetMajorCount = Math.max(2, Math.floor(timelineWidth / 100));

	// Memoize tick generation (only recalculate when dependencies change)
	const tickArray = useMemo(
		() => generateTicks(duration, pixelsPerSecond, targetMajorCount),
		[duration, pixelsPerSecond, targetMajorCount],
	);

	const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!rulerRef.current) return;
		const rect = rulerRef.current.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const time = x / pixelsPerSecond;
		setCurrentTime(Math.max(0, Math.min(duration, time)));
	};

	// Auto-scroll during playback to keep playhead visible
	useEffect(() => {
		if (!isPlaying || !scrollContainerRef.current) return;

		const container = scrollContainerRef.current;

		// Use registerPlayhead to track position and auto-scroll
		const cleanup = registerPlayhead((_time, pixels) => {
			const scrollLeft = container.scrollLeft;
			const containerWidth = container.clientWidth;

			// Keep playhead in view with some margin
			const margin = 100;
			if (pixels > scrollLeft + containerWidth - margin) {
				// Playhead is going off right edge
				container.scrollLeft = pixels - containerWidth + margin;
			} else if (pixels < scrollLeft + margin) {
				// Playhead is going off left edge
				container.scrollLeft = pixels - margin;
			}
		});

		return cleanup;
	}, [isPlaying, registerPlayhead]);

	// Horizontal scroll with mouse wheel
	useEffect(() => {
		const container = scrollContainerRef.current;
		if (!container) return;

		const handleWheel = (e: WheelEvent) => {
			// If shift is held or it's a horizontal scroll gesture, scroll horizontally
			if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
				e.preventDefault();
				container.scrollLeft += e.deltaX || e.deltaY;
			} else {
				// Normal vertical scroll, also allow horizontal scrolling
				e.preventDefault();
				container.scrollLeft += e.deltaY;
			}
		};

		container.addEventListener("wheel", handleWheel, { passive: false });
		return () => container.removeEventListener("wheel", handleWheel);
	}, []);

	return (
		<div className="flex-1 flex">
			<div className="w-48 shrink-0 bg-background/95 border-r-2 border-border/70">
				<div
					className="h-8 bg-gradient-to-b from-muted/40 via-muted/30 to-muted/20 border-b-2 border-border/60 flex items-center justify-between px-2"
					style={{
						boxShadow: "inset 0 2px 4px rgba(0,0,0,0.2)",
					}}
				>
					<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
						Tracks
					</span>
					<Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => addTrack()}>
						<Plus className="w-3 h-3" />
					</Button>
				</div>

				{tracks.map((track) => (
					<TrackLabel key={track.id} track={track} />
				))}
			</div>

			<div ref={scrollContainerRef} className="flex-1 overflow-auto">
				<div style={{ minWidth: `${timelineWidth}px` }}>
					<div className="sticky top-0 bg-background">
						<div
							ref={rulerRef}
							className="h-8 bg-gradient-to-b from-muted/40 via-muted/30 to-muted/20 relative cursor-pointer select-none border-b-2 border-border/60"
							style={{
								boxShadow:
									"inset 0 2px 4px rgba(0,0,0,0.2), inset 0 -1px 2px rgba(255,255,255,0.05)",
							}}
							onClick={handleRulerClick}
						>
							{tickArray.map((tick) => (
								<TimelineTick key={`tick-${tick.time}`} tick={tick} />
							))}

							<RulerPlayhead registerPlayhead={registerPlayhead} />
						</div>
					</div>

					{/* Track content */}
					<div className="relative">
						{tracks.map((track) => (
							<Track
								key={track.id}
								track={track}
								pixelsPerSecond={pixelsPerSecond}
								majorInterval={majorInterval}
								minorInterval={minorInterval}
							/>
						))}
						<TrackPlayhead registerPlayhead={registerPlayhead} />
					</div>
				</div>
			</div>
		</div>
	);
}
