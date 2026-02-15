import toWav from "audiobuffer-to-wav";
import type { Clip, Track } from "@/types/editor";

/**
 * Calculate the total duration needed for export
 * This is the maximum end time across all clips
 */
function calculateTotalDuration(tracks: Track[]): number {
	let maxEndTime = 0;

	tracks.forEach((track) => {
		track.clips.forEach((clip) => {
			const clipEndTime = clip.startTime + clip.duration - clip.trimEnd;
			maxEndTime = Math.max(maxEndTime, clipEndTime);
		});
	});

	return maxEndTime;
}

/**
 * Schedule a clip in the offline audio context
 * Adapted from audio-engine.ts scheduleClip logic
 */
function scheduleClipOffline(ctx: OfflineAudioContext, clip: Clip): void {
	if (!clip.audioBuffer) {
		return;
	}

	const source = ctx.createBufferSource();
	const gainNode = ctx.createGain();

	source.buffer = clip.audioBuffer;
	source.playbackRate.value = clip.playbackRate;
	gainNode.gain.value = clip.volume;

	source.connect(gainNode);
	gainNode.connect(ctx.destination);

	// Calculate effective playback parameters
	const offset = clip.trimStart;
	const effectiveDuration = clip.duration - clip.trimStart - clip.trimEnd;
	const startTime = clip.startTime;

	source.start(startTime, offset, effectiveDuration);
}

/**
 * Export all tracks to a WAV file
 * Returns a Blob containing the WAV audio data
 */
export async function exportToWav(tracks: Track[]): Promise<Blob> {
	// Calculate total duration
	const duration = calculateTotalDuration(tracks);

	if (duration === 0) {
		throw new Error("Nothing to export: no clips found");
	}

	// Create offline audio context
	const sampleRate = 44100;
	const numberOfChannels = 2; // Stereo
	const totalSamples = Math.ceil(sampleRate * duration);

	const offlineContext = new OfflineAudioContext(numberOfChannels, totalSamples, sampleRate);

	// Schedule all clips
	tracks.forEach((track) => {
		track.clips.forEach((clip) => {
			scheduleClipOffline(offlineContext, clip);
		});
	});

	// Render audio
	const renderedBuffer = await offlineContext.startRendering();

	// Convert to WAV using library
	const wavArrayBuffer = toWav(renderedBuffer);
	const blob = new Blob([wavArrayBuffer], { type: "audio/wav" });

	return blob;
}
