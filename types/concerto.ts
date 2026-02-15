export interface ConcertoSoundRef {
	id: string;
	name: string;
	originalPath: string;
	source: "default" | "uploaded" | "recorded" | "exported";
	duration?: number;
}

export interface ConcertoClip {
	id: string;
	soundRefId: string; // links to ConcertoSoundRef.id
	filename: string;
	startTime: number;
	duration: number;
	trimStart: number;
	trimEnd: number;
	volume: number;
	playbackRate: number;
}

export interface ConcertoTrack {
	id: string;
	name: string;
	clips: ConcertoClip[];
}

export interface ConcertoProject {
	version: "1.0";
	name: string;
	createdAt: number;
	updatedAt: number;
	duration: number;
	tracks: ConcertoTrack[];
	sounds: ConcertoSoundRef[]; // all referenced sounds
}
