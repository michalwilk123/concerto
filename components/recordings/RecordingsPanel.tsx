"use client";

import { Download, Film, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { EntityListRow } from "@/components/ui/entity-list-row";
import { IconButton } from "@/components/ui/icon-button";
import { InlineButton } from "@/components/ui/inline-button";
import { LoadingIndicator } from "@/components/ui/loading-state";
import { Typography } from "@/components/ui/typography";
import { useRecordingsStore } from "@/stores/recordings-store";
import type { Recording } from "@/types/recording";

interface RecordingsPanelProps {
	groupId: string;
}

function formatSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDate(iso: string): string {
	const d = new Date(iso);
	return d.toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function RecordingsPanel({ groupId }: RecordingsPanelProps) {
	const { recordings, isLoading, fetchRecordings } = useRecordingsStore();
	const [playingUrl, setPlayingUrl] = useState<string | null>(null);

	useEffect(() => {
		fetchRecordings(groupId);
	}, [groupId, fetchRecordings]);

	if (isLoading) {
		return <LoadingIndicator message="Loading recordings..." size={28} minHeight={120} />;
	}

	if (recordings.length === 0) {
		return (
			<EmptyState
				icon={<Film size={48} />}
				title="No recordings yet"
				subtitle="Recordings from meetings will appear here automatically."
			/>
		);
	}

	return (
		<div>
			<Typography as="h2" variant="titleMd" style={{ marginBottom: 16 }}>
				Recordings
			</Typography>

			{playingUrl && (
				<div
					style={{
						marginBottom: 24,
						borderRadius: "var(--radius-lg)",
						overflow: "hidden",
						background: "#000",
					}}
				>
					<video
						src={playingUrl}
						controls
						autoPlay
						style={{ width: "100%", maxHeight: 480, display: "block" }}
					>
						<track
							kind="captions"
							srcLang="en"
							label="English captions"
							src={"data:text/vtt,WEBVTT"}
						/>
					</video>
					<InlineButton
						variant="secondary"
						size="xs"
						onClick={() => setPlayingUrl(null)}
						style={{
							padding: "6px 12px",
							margin: 8,
							color: "var(--text-secondary)",
							fontSize: "0.8rem",
						}}
					>
						Close player
					</InlineButton>
				</div>
			)}

			<div style={{ display: "grid", gap: 8 }}>
				{recordings.map((rec) => (
					<RecordingItem
						key={rec.id}
						recording={rec}
						onPlay={() => setPlayingUrl(rec.url)}
						isPlaying={playingUrl === rec.url}
					/>
				))}
			</div>
		</div>
	);
}

function RecordingItem({
	recording,
	onPlay,
	isPlaying,
}: {
	recording: Recording;
	onPlay: () => void;
	isPlaying: boolean;
}) {
	return (
		<EntityListRow
			selected={isPlaying}
			icon={
				<IconButton
					variant="circle"
					size="md"
					onClick={onPlay}
					title="Play recording"
					style={{
						width: 36,
						height: 36,
						background: "var(--accent-purple)",
						color: "#fff",
					}}
				>
					<Play size={16} fill="#fff" />
				</IconButton>
			}
			title={recording.meetingName}
			subtitle={
				<>
					{recording.name} &middot; {formatSize(recording.size)} &middot;{" "}
					{formatDate(recording.lastModified)}
				</>
			}
			actions={
				<a
					href={recording.url}
					download
					title="Download recording"
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						width: 32,
						height: 32,
						borderRadius: "var(--radius-sm)",
						border: "1px solid var(--border-default)",
						background: "var(--bg-primary)",
						color: "var(--text-secondary)",
						textDecoration: "none",
						flexShrink: 0,
					}}
				>
					<Download size={16} />
				</a>
			}
		/>
	);
}
