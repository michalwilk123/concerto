import type { Clip } from "@/types/editor";

class AudioEngine {
	private audioContext: AudioContext | null = null;
	private scheduledSources: Map<string, AudioBufferSourceNode> = new Map();
	private startTime: number = 0;
	private pauseTime: number = 0;

	constructor() {
		if (typeof window !== "undefined") {
			this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
		}
	}

	private getContext(): AudioContext {
		if (!this.audioContext) {
			this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
		}
		return this.audioContext;
	}

	async play(clips: Clip[], currentTime: number = 0) {
		const context = this.getContext();

		if (context.state === "suspended") {
			await context.resume();
		}

		this.stop();
		this.startTime = context.currentTime - currentTime;

		clips.forEach((clip) => {
			if (!clip.audioBuffer) {
				return;
			}

			const clipStartTime = clip.startTime + clip.trimStart;
			const clipEndTime = clip.startTime + clip.duration - clip.trimEnd;

			// Only schedule if the clip should be playing
			if (currentTime < clipEndTime) {
				const scheduleTime = Math.max(0, clipStartTime - currentTime);
				const offset = Math.max(0, currentTime - clip.startTime + clip.trimStart);
				const duration = clipEndTime - Math.max(currentTime, clip.startTime);

				this.scheduleClip(clip, scheduleTime, offset, duration);
			}
		});
	}

	private scheduleClip(clip: Clip, when: number, offset: number, duration: number) {
		const context = this.getContext();

		if (!clip.audioBuffer) return;

		const source = context.createBufferSource();
		const gainNode = context.createGain();

		source.buffer = clip.audioBuffer;
		source.playbackRate.value = clip.playbackRate;
		gainNode.gain.value = clip.volume;

		source.connect(gainNode);
		gainNode.connect(context.destination);

		const startTime = context.currentTime + when;
		source.start(startTime, offset, duration);

		this.scheduledSources.set(clip.id, source);

		source.onended = () => {
			this.scheduledSources.delete(clip.id);
		};
	}

	pause() {
		const context = this.getContext();
		this.pauseTime = context.currentTime - this.startTime;
		this.stop();
	}

	stop() {
		this.scheduledSources.forEach((source) => {
			try {
				source.stop();
			} catch (_e) {
				// Already stopped
			}
		});
		this.scheduledSources.clear();
		this.startTime = 0;
		this.pauseTime = 0;
	}

	getCurrentTime(): number {
		if (!this.audioContext) return 0;
		return this.audioContext.currentTime - this.startTime;
	}

	close() {
		this.stop();
		if (this.audioContext) {
			this.audioContext.close();
		}
	}

	getAudioContext(): AudioContext {
		return this.getContext();
	}
}

// Singleton instance
let audioEngineInstance: AudioEngine | null = null;

export function getAudioEngine(): AudioEngine {
	if (!audioEngineInstance) {
		audioEngineInstance = new AudioEngine();
	}
	return audioEngineInstance;
}
