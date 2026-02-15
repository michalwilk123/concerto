import { create } from "zustand";
import { serializeProject } from "@/lib/concerto";
import { useSoundLibraryStore } from "@/stores/sound-library-store";
import type { ConcertoProject } from "@/types/concerto";
import type { Clip, ClipMode, DragStartValues, DragType, EditorState, Track } from "@/types/editor";

let clipIdCounter = 0;
let trackIdCounter = 0;

export const useEditorStore = create<EditorState>((set, get) => ({
	// Initial state
	tracks: [
		{
			id: `track-${trackIdCounter++}`,
			name: "Track 1",
			clips: [],
		},
		{
			id: `track-${trackIdCounter++}`,
			name: "Track 2",
			clips: [],
		},
		{
			id: `track-${trackIdCounter++}`,
			name: "Track 3",
			clips: [],
		},
		{
			id: `track-${trackIdCounter++}`,
			name: "Track 4",
			clips: [],
		},
	],
	isPlaying: false,
	isPaused: false,
	currentTime: 0,
	duration: 60,
	pixelsPerSecond: 50,
	selectedClipId: null,
	clipMode: {},
	deleteMode: false,
	activeDrag: null,

	// Track operations
	addTrack: (name?: string) => {
		const newTrack: Track = {
			id: `track-${trackIdCounter++}`,
			name: name || `Track ${get().tracks.length + 1}`,
			clips: [],
		};
		set((state) => ({
			tracks: [...state.tracks, newTrack],
		}));
	},

	removeTrack: (id: string) => {
		set((state) => {
			// Clear selectedClipId if it belongs to this track
			const track = state.tracks.find((t) => t.id === id);
			const clipIds = track?.clips.map((c) => c.id) || [];
			const newSelectedClipId = clipIds.includes(state.selectedClipId || "")
				? null
				: state.selectedClipId;

			return {
				tracks: state.tracks.filter((t) => t.id !== id),
				selectedClipId: newSelectedClipId,
			};
		});
	},

	renameTrack: (id: string, name: string) => {
		set((state) => ({
			tracks: state.tracks.map((t) => (t.id === id ? { ...t, name } : t)),
		}));
	},

	// Clip operations
	addClip: (trackId: string, clipData: Omit<Clip, "id" | "trackId">) => {
		const newClip: Clip = {
			...clipData,
			id: `clip-${clipIdCounter++}`,
			trackId,
		};

		set((state) => ({
			tracks: state.tracks.map((track) =>
				track.id === trackId ? { ...track, clips: [...track.clips, newClip] } : track,
			),
			clipMode: {
				...state.clipMode,
				[newClip.id]: "read",
			},
		}));

		// Update duration if needed
		const endTime = newClip.startTime + newClip.duration;
		if (endTime > get().duration) {
			set({ duration: endTime });
		}
	},

	updateClip: (clipId: string, changes: Partial<Clip>) => {
		set((state) => ({
			tracks: state.tracks.map((track) => ({
				...track,
				clips: track.clips.map((clip) => (clip.id === clipId ? { ...clip, ...changes } : clip)),
			})),
		}));
	},

	removeClip: (clipId: string) => {
		set((state) => ({
			tracks: state.tracks.map((track) => ({
				...track,
				clips: track.clips.filter((clip) => clip.id !== clipId),
			})),
			selectedClipId: state.selectedClipId === clipId ? null : state.selectedClipId,
		}));
	},

	moveClip: (clipId: string, targetTrackId: string, startTime: number) => {
		const state = get();
		let foundClip: Clip | undefined;

		// Find the clip
		for (const track of state.tracks) {
			const clip = track.clips.find((c) => c.id === clipId);
			if (clip) {
				foundClip = clip;
				break;
			}
		}

		if (!foundClip) {
			return;
		}

		// Remove clip from its current track and add to target track
		const updatedClip: Clip = { ...foundClip, trackId: targetTrackId, startTime };
		const newTracks = state.tracks.map((track) => ({
			...track,
			clips: track.clips
				.filter((c) => c.id !== clipId)
				.concat(track.id === targetTrackId ? [updatedClip] : []),
		}));

		set({ tracks: newTracks });
	},

	// Playback
	play: () => {
		console.log("[EditorStore] play() called");
		set({ isPlaying: true, isPaused: false });
		console.log("[EditorStore] state updated, isPlaying should be true");
	},

	pause: () => {
		console.log("[EditorStore] pause() called");
		set({ isPlaying: false, isPaused: true });
	},

	stop: () => {
		console.log("[EditorStore] stop() called");
		set({ isPlaying: false, isPaused: false, currentTime: 0 });
	},

	setCurrentTime: (time: number | ((prev: number) => number)) => {
		if (typeof time === "function") {
			set((state) => ({ currentTime: time(state.currentTime) }));
		} else {
			set({ currentTime: time });
		}
	},

	// UI
	zoom: (factor: number) => {
		set((state) => ({
			pixelsPerSecond: Math.max(10, Math.min(200, state.pixelsPerSecond * factor)),
		}));
	},

	selectClip: (clipId: string | null) => {
		set({ selectedClipId: clipId });
	},

	setClipMode: (clipId: string, mode: ClipMode) => {
		set((state) => ({
			clipMode: {
				...state.clipMode,
				[clipId]: mode,
			},
		}));
	},

	resetAllClipModes: () => {
		set((state) => {
			const newClipMode: Record<string, ClipMode> = {};
			Object.keys(state.clipMode).forEach((clipId) => {
				newClipMode[clipId] = "read";
			});
			return { clipMode: newClipMode };
		});
	},

	toggleDeleteMode: () => {
		set((state) => ({ deleteMode: !state.deleteMode }));
	},

	// Drag operations (for transient updates)
	startDrag: (clipId: string, type: DragType, startValues: DragStartValues) => {
		set({ activeDrag: { clipId, type, startValues, offset: { x: 0, y: 0 } } });
	},

	updateDragOffset: (delta: { x: number; y: number }) => {
		set((state) => {
			if (!state.activeDrag) return state;
			return {
				activeDrag: {
					...state.activeDrag,
					offset: {
						x: state.activeDrag.offset.x + delta.x,
						y: state.activeDrag.offset.y + delta.y,
					},
				},
			};
		});
	},

	endDrag: () => {
		set({ activeDrag: null });
	},
}));

/**
 * Returns a JSON-serializable ConcertoProject capturing the current editor state.
 * Reads from both the editor store and the sound library store.
 */
export function getProjectMetadata(name = "Untitled Project"): ConcertoProject {
	const { tracks, duration } = useEditorStore.getState();
	const { userSounds } = useSoundLibraryStore.getState();
	return serializeProject(name, tracks, duration, userSounds);
}
