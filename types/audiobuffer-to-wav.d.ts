declare module "audiobuffer-to-wav" {
	/**
	 * Convert an AudioBuffer to a WAV file ArrayBuffer
	 * @param buffer - The AudioBuffer to convert
	 * @returns ArrayBuffer containing the WAV file data
	 */
	function toWav(buffer: AudioBuffer): ArrayBuffer;
	export default toWav;
}
