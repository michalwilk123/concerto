"use client";

import { useEffect, useRef } from "react";

interface AudioWaveformProps {
	analyserNode: AnalyserNode | null;
	isActive: boolean;
	width?: number;
	height?: number;
}

export default function AudioWaveform({
	analyserNode,
	isActive,
	width = 300,
	height = 80,
}: AudioWaveformProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const rafRef = useRef<number>(0);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const dpr = window.devicePixelRatio || 1;
		canvas.width = width * dpr;
		canvas.height = height * dpr;
		ctx.scale(dpr, dpr);

		const bufferLength = analyserNode ? analyserNode.frequencyBinCount : 0;
		const dataArray = new Uint8Array(bufferLength);

		const draw = () => {
			rafRef.current = requestAnimationFrame(draw);

			ctx.fillStyle = "#282830";
			ctx.fillRect(0, 0, width, height);

			ctx.lineWidth = 2;
			ctx.strokeStyle = isActive ? "#3d9b4f" : "#3a3a44";
			ctx.beginPath();

			if (analyserNode && isActive) {
				analyserNode.getByteTimeDomainData(dataArray);
				const sliceWidth = width / bufferLength;
				let x = 0;
				for (let i = 0; i < bufferLength; i++) {
					const v = dataArray[i] / 128.0;
					const y = (v * height) / 2;
					if (i === 0) ctx.moveTo(x, y);
					else ctx.lineTo(x, y);
					x += sliceWidth;
				}
			} else {
				ctx.moveTo(0, height / 2);
				ctx.lineTo(width, height / 2);
			}

			ctx.stroke();
		};

		draw();

		return () => {
			cancelAnimationFrame(rafRef.current);
		};
	}, [analyserNode, isActive, width, height]);

	return (
		<canvas
			ref={canvasRef}
			style={{
				width,
				height,
				borderRadius: "var(--radius-md)",
				background: "var(--bg-tertiary)",
				display: "block",
			}}
		/>
	);
}
