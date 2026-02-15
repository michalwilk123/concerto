import type { SoundFile } from "@/types/editor";

/**
 * Default sound files available in the sound library
 */
export const DEFAULT_SOUNDS: SoundFile[] = [
	{
		id: "default-small-crowd",
		name: "Small crowd pre-concert",
		path: "/sounds/243373__johnsonbrandediting__small-crowd-pre-concert-talking-party-bar-walla-talking.mp3",
		source: "default",
		createdAt: 0,
	},
	{
		id: "default-orchestral-strings",
		name: "Orchestral strings warm",
		path: "/sounds/402656__inspectorj__orchestral-strings-warm-a.wav",
		source: "default",
		createdAt: 0,
	},
	{
		id: "default-texture-1",
		name: "Texture 1",
		path: "/sounds/443305__levelclearer__texture1.wav",
		source: "default",
		createdAt: 0,
	},
	{
		id: "default-piano-loops",
		name: "Piano loops octave up",
		path: "/sounds/841821__josefpres__piano-loops-200-octave-up-short-loop-120-bpm.wav",
		source: "default",
		createdAt: 0,
	},
];
