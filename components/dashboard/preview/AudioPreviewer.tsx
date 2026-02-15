"use client";

import { useEffect, useRef } from "react";
import type { PreviewerProps } from "./types";

export function AudioPreviewer({ fileUrl }: PreviewerProps) {
	const audioRef = useRef<HTMLAudioElement>(null);

	useEffect(() => {
		return () => {
			audioRef.current?.pause();
		};
	}, []);

	return (
		<div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
			<audio ref={audioRef} controls style={{ width: "100%", maxWidth: 640 }} src={fileUrl}>
				Your browser does not support the audio element.
			</audio>
		</div>
	);
}
