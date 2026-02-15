import { useCallback, useEffect, useRef, useState } from "react";
import { useEditorStore } from "@/stores/editor-store";

/**
 * Manages playhead animation during playback without updating Zustand state.
 * This prevents 60fps re-renders across the entire UI.
 */
export function usePlayheadAnimation() {
	const { isPlaying, currentTime: storeCurrentTime, pixelsPerSecond } = useEditorStore();
	console.log("[PlayheadAnimation] Hook called", { isPlaying, storeCurrentTime });

	const animationFrameRef = useRef<number | null>(null);
	const playheadTimeRef = useRef(storeCurrentTime);
	const lastFrameTimeRef = useRef<number>(0);
	const playheadElementsRef = useRef<Set<(time: number, pixels: number) => void>>(new Set());

	// Throttled time for displays (updates every ~100ms instead of 60fps)
	const [displayTime, setDisplayTime] = useState(storeCurrentTime);
	const lastDisplayUpdateRef = useRef(0);

	// Sync with store when not playing or when store time changes (manual seek)
	useEffect(() => {
		console.log("[PlayheadAnimation] sync effect", { isPlaying, storeCurrentTime });
		if (!isPlaying) {
			playheadTimeRef.current = storeCurrentTime;
			setDisplayTime(storeCurrentTime);
			const pixels = playheadTimeRef.current * pixelsPerSecond;
			// Ensure playhead visuals update when playback stops or seeks.
			playheadElementsRef.current.forEach((callback) => {
				callback(playheadTimeRef.current, pixels);
			});
		}
	}, [storeCurrentTime, isPlaying, pixelsPerSecond]);

	useEffect(() => {
		console.log("[PlayheadAnimation] animation effect", {
			isPlaying,
			storeCurrentTime,
			pixelsPerSecond,
		});
		if (!isPlaying) {
			if (animationFrameRef.current) {
				console.log("[PlayheadAnimation] canceling animation frame");
				cancelAnimationFrame(animationFrameRef.current);
				animationFrameRef.current = null;
			}
			return;
		}

		console.log("[PlayheadAnimation] starting animation");
		playheadTimeRef.current = storeCurrentTime;
		lastFrameTimeRef.current = performance.now();
		lastDisplayUpdateRef.current = performance.now();

		const animate = (time: number) => {
			const deltaTime = (time - lastFrameTimeRef.current) / 1000;
			lastFrameTimeRef.current = time;

			playheadTimeRef.current += deltaTime;
			const pixels = playheadTimeRef.current * pixelsPerSecond;

			// Update all registered playhead elements directly (no React re-render)
			playheadElementsRef.current.forEach((callback) => {
				callback(playheadTimeRef.current, pixels);
			});

			// Update display time every 100ms for time displays
			if (time - lastDisplayUpdateRef.current > 100) {
				setDisplayTime(playheadTimeRef.current);
				lastDisplayUpdateRef.current = time;
			}

			animationFrameRef.current = requestAnimationFrame(animate);
		};

		animationFrameRef.current = requestAnimationFrame(animate);
		console.log("[PlayheadAnimation] animation frame started");

		return () => {
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current);
			}
		};
	}, [isPlaying, storeCurrentTime, pixelsPerSecond]);

	// Register a callback that gets called every frame with updated time/position
	const registerPlayhead = useCallback(
		(callback: (time: number, pixels: number) => void) => {
			playheadElementsRef.current.add(callback);
			// Call immediately with current values
			const pixels = playheadTimeRef.current * pixelsPerSecond;
			callback(playheadTimeRef.current, pixels);

			return () => {
				playheadElementsRef.current.delete(callback);
			};
		},
		[pixelsPerSecond],
	);

	// Get current time (for non-reactive reads)
	const getCurrentTime = useCallback(() => playheadTimeRef.current, []);

	return {
		displayTime,
		registerPlayhead,
		getCurrentTime,
	};
}
