"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type RecordingStatus = "idle" | "recording" | "paused";

export interface Recording {
	id: string;
	url: string;
	blob: Blob;
	timestamp: number;
	duration: number;
}

interface MicDevice {
	deviceId: string;
	label: string;
}

interface AudioRecorderState {
	status: RecordingStatus;
	recordings: Recording[];
	availableMics: MicDevice[];
	selectedMicId: string;
	analyserNode: AnalyserNode | null;
	elapsedTime: number;
	error: string | null;
}

interface AudioRecorderActions {
	startRecording: () => Promise<void>;
	stopRecording: () => void;
	pauseRecording: () => void;
	resumeRecording: () => void;
	selectMic: (deviceId: string) => void;
	deleteRecording: (id: string) => void;
}

export type UseAudioRecorderReturn = AudioRecorderState & AudioRecorderActions;

export function useAudioRecorder(): UseAudioRecorderReturn {
	const [status, setStatus] = useState<RecordingStatus>("idle");
	const [recordings, setRecordings] = useState<Recording[]>([]);
	const [availableMics, setAvailableMics] = useState<MicDevice[]>([]);
	const [selectedMicId, setSelectedMicId] = useState<string>("");
	const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
	const [elapsedTime, setElapsedTime] = useState(0);
	const [error, setError] = useState<string | null>(null);

	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const audioContextRef = useRef<AudioContext | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const chunksRef = useRef<Blob[]>([]);
	const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const recordingStartRef = useRef<number>(0);
	const pausedDurationRef = useRef<number>(0);
	const pauseTimestampRef = useRef<number>(0);
	const objectUrlsRef = useRef<string[]>([]);

	const enumerateMics = useCallback(async () => {
		const devices = await navigator.mediaDevices.enumerateDevices();
		const mics = devices
			.filter((d) => d.kind === "audioinput" && d.deviceId)
			.map((d) => ({
				deviceId: d.deviceId,
				label: d.label || `Microphone ${d.deviceId.slice(0, 6)}`,
			}));
		setAvailableMics(mics);
		if (mics.length > 0 && !mics.find((m) => m.deviceId === selectedMicId)) {
			setSelectedMicId(mics[0].deviceId);
		}
	}, [selectedMicId]);

	useEffect(() => {
		enumerateMics();
		navigator.mediaDevices.addEventListener("devicechange", enumerateMics);
		return () => {
			navigator.mediaDevices.removeEventListener("devicechange", enumerateMics);
		};
	}, [enumerateMics]);

	useEffect(() => {
		return () => {
			if (timerRef.current) clearInterval(timerRef.current);
			streamRef.current?.getTracks().forEach((t) => t.stop());
			audioContextRef.current?.close();
			objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
		};
	}, []);

	const startTimer = () => {
		timerRef.current = setInterval(() => {
			const now = Date.now();
			setElapsedTime(
				Math.floor((now - recordingStartRef.current - pausedDurationRef.current) / 1000),
			);
		}, 200);
	};

	const stopTimer = () => {
		if (timerRef.current) {
			clearInterval(timerRef.current);
			timerRef.current = null;
		}
	};

	const startRecording = async () => {
		setError(null);
		try {
			const constraints: MediaStreamConstraints = {
				audio: selectedMicId ? { deviceId: { exact: selectedMicId } } : true,
			};
			const stream = await navigator.mediaDevices.getUserMedia(constraints);
			streamRef.current = stream;

			await enumerateMics();

			const audioContext = new AudioContext();
			audioContextRef.current = audioContext;
			const source = audioContext.createMediaStreamSource(stream);
			const analyser = audioContext.createAnalyser();
			analyser.fftSize = 2048;
			source.connect(analyser);
			setAnalyserNode(analyser);

			const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
				? "audio/webm;codecs=opus"
				: MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
					? "audio/ogg;codecs=opus"
					: "";

			const recorder = mimeType
				? new MediaRecorder(stream, { mimeType })
				: new MediaRecorder(stream);

			chunksRef.current = [];
			recorder.ondataavailable = (e) => {
				if (e.data.size > 0) chunksRef.current.push(e.data);
			};
			recorder.onstop = () => {
				const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
				const url = URL.createObjectURL(blob);
				objectUrlsRef.current.push(url);
				const duration = Math.floor(
					(Date.now() - recordingStartRef.current - pausedDurationRef.current) / 1000,
				);
				setRecordings((prev) => [
					...prev,
					{
						id: crypto.randomUUID(),
						url,
						blob,
						timestamp: Date.now(),
						duration,
					},
				]);
			};

			mediaRecorderRef.current = recorder;
			recorder.start(1000);

			recordingStartRef.current = Date.now();
			pausedDurationRef.current = 0;
			setElapsedTime(0);
			setStatus("recording");
			startTimer();
		} catch (err: any) {
			setError(err.message || "Failed to access microphone");
		}
	};

	const stopRecording = () => {
		const recorder = mediaRecorderRef.current;
		if (recorder && recorder.state !== "inactive") {
			recorder.stop();
		}
		stopTimer();
		streamRef.current?.getTracks().forEach((t) => t.stop());
		streamRef.current = null;
		audioContextRef.current?.close();
		audioContextRef.current = null;
		setAnalyserNode(null);
		setStatus("idle");
	};

	const pauseRecording = () => {
		const recorder = mediaRecorderRef.current;
		if (recorder && recorder.state === "recording") {
			recorder.pause();
			pauseTimestampRef.current = Date.now();
			stopTimer();
			setStatus("paused");
		}
	};

	const resumeRecording = () => {
		const recorder = mediaRecorderRef.current;
		if (recorder && recorder.state === "paused") {
			pausedDurationRef.current += Date.now() - pauseTimestampRef.current;
			recorder.resume();
			startTimer();
			setStatus("recording");
		}
	};

	const selectMic = (deviceId: string) => {
		if (status !== "idle") return;
		setSelectedMicId(deviceId);
	};

	const deleteRecording = (id: string) => {
		setRecordings((prev) => {
			const rec = prev.find((r) => r.id === id);
			if (rec) {
				URL.revokeObjectURL(rec.url);
				objectUrlsRef.current = objectUrlsRef.current.filter((u) => u !== rec.url);
			}
			return prev.filter((r) => r.id !== id);
		});
	};

	return {
		status,
		recordings,
		availableMics,
		selectedMicId,
		analyserNode,
		elapsedTime,
		error,
		startRecording,
		stopRecording,
		pauseRecording,
		resumeRecording,
		selectMic,
		deleteRecording,
	};
}
