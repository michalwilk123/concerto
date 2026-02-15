export type ClipMode = "read" | "cut" | "volume-tempo";
export type DragType = "move" | "trim-start" | "trim-end" | "volume-tempo";

export interface SoundFile {
	id: string;
	name: string;
	path: string;
	isExported?: boolean;
	source: "default" | "uploaded" | "recorded" | "exported";
	duration?: number;
	createdAt: number;
}

export interface DragStartValues {
	trimStart?: number;
	trimEnd?: number;
	volume?: number;
	playbackRate?: number;
	startTime?: number;
}

export interface ActiveDrag {
	clipId: string;
	type: DragType;
	startValues: DragStartValues;
	offset: { x: number; y: number };
}

export interface Clip {
	id: string;
	trackId: string;
	filename: string;
	audioBuffer: AudioBuffer | null;
	startTime: number; // Position on timeline (seconds)
	duration: number; // Original duration
	trimStart: number; // Cut from beginning (seconds)
	trimEnd: number; // Cut from end (seconds)
	volume: number; // 0-2 (0-200%)
	playbackRate: number; // 0.5-2 (speed)
}

export interface Track {
	id: string;
	name: string;
	clips: Clip[];
}

export interface EditorState {
	// Tracks
	tracks: Track[];
	addTrack: (name?: string) => void;
	removeTrack: (id: string) => void;
	renameTrack: (id: string, name: string) => void;

	// Clips
	addClip: (trackId: string, clip: Omit<Clip, "id" | "trackId">) => void;
	updateClip: (clipId: string, changes: Partial<Clip>) => void;
	removeClip: (clipId: string) => void;
	moveClip: (clipId: string, targetTrackId: string, startTime: number) => void;

	// Playback
	isPlaying: boolean;
	isPaused: boolean;
	currentTime: number;
	duration: number;
	setCurrentTime: (time: number | ((prev: number) => number)) => void;
	play: () => void;
	pause: () => void;
	stop: () => void;

	// UI
	pixelsPerSecond: number;
	zoom: (factor: number) => void;
	selectedClipId: string | null;
	selectClip: (clipId: string | null) => void;
	clipMode: Record<string, ClipMode>;
	setClipMode: (clipId: string, mode: ClipMode) => void;
	resetAllClipModes: () => void;
	deleteMode: boolean;
	toggleDeleteMode: () => void;

	// Drag state (transient - read with getState(), not hooks)
	activeDrag: ActiveDrag | null;
	startDrag: (clipId: string, type: DragType, startValues: DragStartValues) => void;
	updateDragOffset: (delta: { x: number; y: number }) => void;
	endDrag: () => void;
}
