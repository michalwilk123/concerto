import { tickStep } from "d3-array";

/**
 * Format seconds as a time string
 * @param seconds - Time in seconds
 * @param format - Output format (default: 'mm:ss.ms')
 */
export function formatTime(
	seconds: number,
	format: "mm:ss.ms" | "mm:ss" | "m:ss" = "mm:ss.ms",
): string {
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);

	if (format === "m:ss") {
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	}

	if (format === "mm:ss") {
		return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
	}

	// Default format: 'mm:ss.ms'
	const ms = Math.floor((seconds % 1) * 100);
	return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
}

/**
 * Snap a value to the nearest grid increment
 * @param value - Value to snap
 * @param gridSize - Grid increment size
 */
export function snapToGrid(value: number, gridSize: number): number {
	return Math.round(value / gridSize) * gridSize;
}

/**
 * Calculate nice grid intervals for timeline display
 * @param pixelsPerSecond - Zoom level (pixels per second)
 * @param duration - Total timeline duration in seconds
 * @returns Object with major and minor grid intervals
 */
export function getGridIntervals(pixelsPerSecond: number, duration: number) {
	// Calculate how many major ticks we want (~1 every 100px)
	const timelineWidth = duration * pixelsPerSecond;
	const targetMajorCount = Math.max(2, Math.floor(timelineWidth / 100));

	// d3.tickStep returns nice intervals (powers of 10 × 1, 2, or 5)
	const major = tickStep(0, duration, targetMajorCount);
	const minor = major / 5;

	return { major, minor };
}
