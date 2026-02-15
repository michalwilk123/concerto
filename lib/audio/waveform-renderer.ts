/**
 * Waveform Renderer - Canvas-based audio waveform visualization
 */

export interface WaveformOptions {
	width: number;
	height: number;
	waveColor?: string;
	backgroundColor?: string;
	barWidth?: number;
	barGap?: number;
	trimStart?: number;
	trimEnd?: number;
}

/**
 * Renders an audio buffer as a waveform on a canvas
 */
export function renderWaveform(
	audioBuffer: AudioBuffer,
	canvas: HTMLCanvasElement,
	options: WaveformOptions,
): void {
	const {
		width,
		height,
		waveColor = "#60a5fa",
		backgroundColor = "transparent",
		barWidth = 2,
		barGap = 1,
		trimStart = 0,
		trimEnd = 0,
	} = options;

	// Set canvas dimensions
	canvas.width = width;
	canvas.height = height;

	const ctx = canvas.getContext("2d");
	if (!ctx) return;

	// Clear canvas
	ctx.fillStyle = backgroundColor;
	ctx.fillRect(0, 0, width, height);

	// Get audio data from first channel
	const data = audioBuffer.getChannelData(0);
	const _duration = audioBuffer.duration;
	const sampleRate = audioBuffer.sampleRate;

	// Calculate trim offsets in samples
	const trimStartSamples = Math.floor(trimStart * sampleRate);
	const trimEndSamples = Math.floor(trimEnd * sampleRate);
	const visibleLength = data.length - trimStartSamples - trimEndSamples;

	const step = Math.ceil(visibleLength / width);
	const amp = height / 2;

	// Draw waveform bars
	ctx.fillStyle = waveColor;

	for (let i = 0; i < width; i += barWidth + barGap) {
		let min = 1.0;
		let max = -1.0;

		// Find min and max in this segment (accounting for trim)
		for (let j = 0; j < step; j++) {
			const sampleIndex = trimStartSamples + i * step + j;
			if (sampleIndex >= data.length - trimEndSamples) break;
			const datum = data[sampleIndex];
			if (datum < min) min = datum;
			if (datum > max) max = datum;
		}

		// Draw bar from center
		const barHeight = Math.max(1, (max - min) * amp);
		const y = amp - max * amp;

		ctx.fillRect(i, y, barWidth, barHeight);
	}
}
