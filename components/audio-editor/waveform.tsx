"use client";

import { useEffect, useRef } from "react";
import { renderWaveform } from "@/lib/audio";

interface WaveformProps {
	audioBuffer: AudioBuffer | null;
	width: number;
	height: number;
	waveColor?: string;
	backgroundColor?: string;
	trimStart?: number;
	trimEnd?: number;
}

export function Waveform({
	audioBuffer,
	width,
	height,
	waveColor = "#a78bfa",
	backgroundColor = "transparent",
	trimStart = 0,
	trimEnd = 0,
}: WaveformProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas || !audioBuffer) return;

		renderWaveform(audioBuffer, canvas, {
			width,
			height,
			waveColor,
			backgroundColor,
			barWidth: 2,
			barGap: 1,
			trimStart,
			trimEnd,
		});
	}, [audioBuffer, width, height, waveColor, backgroundColor, trimStart, trimEnd]);

	return (
		<canvas
			ref={canvasRef}
			className="absolute inset-0 w-full h-full pointer-events-none"
			style={{ opacity: 0.6 }}
		/>
	);
}
