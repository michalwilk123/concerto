"use client";

import { useId } from "react";

interface ConcertoLogoProps {
	size?: "sm" | "md" | "lg";
}

const dimensions = {
	sm: { width: 128, height: 32, fontSize: 14, arcR: 8, arcWeight: 1.1, gap: 3 },
	md: { width: 182, height: 46, fontSize: 20, arcR: 12, arcWeight: 1.4, gap: 5 },
	lg: { width: 266, height: 66, fontSize: 30, arcR: 17, arcWeight: 1.8, gap: 6 },
} as const;

export default function ConcertoLogo({ size = "md" }: ConcertoLogoProps) {
	const id = useId();
	const p = `concerto-${id}`;
	const { width, height, fontSize, arcR, arcWeight, gap } = dimensions[size];

	const cy = height / 2;
	const arcX = arcR + 4;
	const textX = arcX + arcR + gap;

	const arcs = [
		{ r: arcR * 0.5, opacity: 0.95, purple: true },
		{ r: arcR * 0.78, opacity: 0.55, purple: false },
		{ r: arcR * 1.05, opacity: 0.3, purple: false },
	];

	return (
		<svg
			width={width}
			height={height}
			viewBox={`0 0 ${width} ${height}`}
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			role="img"
			aria-label="Concerto"
		>
			<defs>
				<linearGradient
					id={`${p}-silver`}
					x1="0"
					y1="0"
					x2="0"
					y2={height}
					gradientUnits="userSpaceOnUse"
				>
					<stop offset="0%" stopColor="#e8e8e8" />
					<stop offset="50%" stopColor="#f5f5f5" />
					<stop offset="100%" stopColor="#c0c0c0" />
				</linearGradient>
				<linearGradient
					id={`${p}-purple`}
					x1="0"
					y1="0"
					x2="0"
					y2={height}
					gradientUnits="userSpaceOnUse"
				>
					<stop offset="0%" stopColor="#a78bfa" />
					<stop offset="100%" stopColor="#7c3aed" />
				</linearGradient>
				<linearGradient id={`${p}-text`} x1="0" y1="0" x2={width} y2="0">
					<stop offset="0%" stopColor="#d4d4d4" />
					<stop offset="25%" stopColor="#f5f5f5" />
					<stop offset="55%" stopColor="#e8e8e8" />
					<stop offset="100%" stopColor="#c0c0c0" />
				</linearGradient>
			</defs>

			{arcs.map((arc, i) => (
				<path
					key={i}
					d={`M ${arcX} ${cy - arc.r} A ${arc.r} ${arc.r} 0 0 0 ${arcX} ${cy + arc.r}`}
					stroke={arc.purple ? `url(#${p}-purple)` : `url(#${p}-silver)`}
					strokeWidth={arcWeight}
					strokeLinecap="round"
					fill="none"
					opacity={arc.opacity}
				/>
			))}

			<text
				x={textX}
				y={height / 2}
				textAnchor="start"
				dominantBaseline="central"
				fill={`url(#${p}-text)`}
				fontFamily="'DM Sans', system-ui, sans-serif"
				fontWeight="500"
				fontSize={fontSize}
				letterSpacing="-0.01em"
			>
				Concerto
			</text>
		</svg>
	);
}
