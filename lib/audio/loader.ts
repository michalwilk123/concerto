import { getAudioEngine } from "./engine";

export async function loadAudioBuffer(url: string): Promise<AudioBuffer> {
	const audioContext = getAudioEngine().getAudioContext();

	const response = await fetch(url);
	const arrayBuffer = await response.arrayBuffer();
	const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

	return audioBuffer;
}
