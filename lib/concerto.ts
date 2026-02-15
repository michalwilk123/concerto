import type {
	ConcertoClip,
	ConcertoProject,
	ConcertoSoundRef,
	ConcertoTrack,
} from "@/types/concerto";
import type { SoundFile, Track } from "@/types/editor";

/**
 * Serializes the current editor state into a plain JSON-serializable
 * ConcertoProject object (no AudioBuffer references).
 */
export function serializeProject(
	name: string,
	tracks: Track[],
	duration: number,
	allSounds: SoundFile[],
): ConcertoProject {
	const soundRefMap = new Map<string, ConcertoSoundRef>();

	const concertoTracks: ConcertoTrack[] = tracks.map((track) => {
		const concertoClips: ConcertoClip[] = track.clips.map((clip) => {
			// Try to find the matching sound by filename/path
			const matchedSound = allSounds.find(
				(s) => s.path === clip.filename || s.name === clip.filename,
			);

			// Build or reuse a sound reference
			const refId = matchedSound?.id ?? clip.filename;
			if (!soundRefMap.has(refId)) {
				soundRefMap.set(refId, {
					id: refId,
					name: matchedSound?.name ?? clip.filename,
					originalPath: matchedSound?.path ?? clip.filename,
					source: matchedSound?.source ?? "uploaded",
					duration: matchedSound?.duration,
				});
			}

			return {
				id: clip.id,
				soundRefId: refId,
				filename: clip.filename,
				startTime: clip.startTime,
				duration: clip.duration,
				trimStart: clip.trimStart,
				trimEnd: clip.trimEnd,
				volume: clip.volume,
				playbackRate: clip.playbackRate,
			};
		});

		return {
			id: track.id,
			name: track.name,
			clips: concertoClips,
		};
	});

	const now = Date.now();

	return {
		version: "1.0",
		name,
		createdAt: now,
		updatedAt: now,
		duration,
		tracks: concertoTracks,
		sounds: Array.from(soundRefMap.values()),
	};
}
