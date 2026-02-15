import { create } from "zustand";
import { DEFAULT_SOUNDS } from "@/lib/constants/sounds";
import type { SoundFile } from "@/types/editor";

export type { SoundFile };

interface SoundLibraryState {
	userSounds: SoundFile[];
	hiddenDefaultIds: Set<string>;

	addSound: (sound: SoundFile) => void;
	addSounds: (sounds: SoundFile[]) => void;
	removeSound: (id: string) => void;
	renameSound: (id: string, newName: string) => void;
}

export const useSoundLibraryStore = create<SoundLibraryState>((set, _get) => ({
	userSounds: [],
	hiddenDefaultIds: new Set(),

	addSound: (sound) => {
		set((state) => ({
			userSounds: [...state.userSounds, sound],
		}));
	},

	addSounds: (sounds) => {
		set((state) => ({
			userSounds: [...state.userSounds, ...sounds],
		}));
	},

	removeSound: (id) => {
		const isDefault = DEFAULT_SOUNDS.some((s) => s.id === id);
		if (isDefault) {
			set((state) => {
				const next = new Set(state.hiddenDefaultIds);
				next.add(id);
				return { hiddenDefaultIds: next };
			});
		} else {
			set((state) => {
				const sound = state.userSounds.find((s) => s.id === id);
				if (sound?.path.startsWith("blob:")) {
					URL.revokeObjectURL(sound.path);
				}
				return {
					userSounds: state.userSounds.filter((s) => s.id !== id),
				};
			});
		}
	},

	renameSound: (id, newName) => {
		const isDefault = DEFAULT_SOUNDS.some((s) => s.id === id);
		if (isDefault) {
			const original = DEFAULT_SOUNDS.find((s) => s.id === id)!;
			const clone: SoundFile = {
				...original,
				id: crypto.randomUUID(),
				name: newName,
				source: "default",
				createdAt: Date.now(),
			};
			set((state) => {
				const next = new Set(state.hiddenDefaultIds);
				next.add(id);
				return {
					userSounds: [...state.userSounds, clone],
					hiddenDefaultIds: next,
				};
			});
		} else {
			set((state) => ({
				userSounds: state.userSounds.map((s) => (s.id === id ? { ...s, name: newName } : s)),
			}));
		}
	},
}));

export function useAllSounds(): SoundFile[] {
	const { userSounds, hiddenDefaultIds } = useSoundLibraryStore();
	const visibleDefaults = DEFAULT_SOUNDS.filter((s) => !hiddenDefaultIds.has(s.id));
	return [...visibleDefaults, ...userSounds];
}
