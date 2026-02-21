"use client";

import { CalendarDays, Plus, RotateCcw, Trash2, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CreateMeetingModal } from "@/components/CreateMeetingModal";
import { EmptyState } from "@/components/ui/empty-state";
import { EntityListRow } from "@/components/ui/entity-list-row";
import { IconButton } from "@/components/ui/icon-button";
import { InlineButton } from "@/components/ui/inline-button";
import { LoadingIndicator } from "@/components/ui/loading-state";
import { Typography } from "@/components/ui/typography";
import { roomApi } from "@/lib/api-client";
import { useMeetingsStore } from "@/stores/meetings-store";
import type { Meeting } from "@/types/meeting";

interface MeetingsPanelProps {
	groupId: string;
	selectedMeetingId?: string;
	onSelectMeeting?: (id: string) => void;
	headerExtra?: React.ReactNode;
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

export function MeetingsPanel({ groupId, selectedMeetingId, onSelectMeeting, headerExtra }: MeetingsPanelProps) {
	const router = useRouter();
	const { meetings, isLoading, fetchMeetings, deleteMeeting } = useMeetingsStore();
	const [showCreateMeeting, setShowCreateMeeting] = useState(false);

	useEffect(() => {
		fetchMeetings(groupId);
	}, [groupId, fetchMeetings]);

	if (isLoading) {
		return <LoadingIndicator message="Loading meetings..." size={28} containerStyle={{ height: "60vh" }} />;
	}

	return (
		<div>
			<CreateMeetingModal
				open={showCreateMeeting}
				onClose={() => setShowCreateMeeting(false)}
				onCreated={(meetingId) => router.push(`/meet/${meetingId}`)}
			/>

			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					marginBottom: 16,
				}}
			>
				<Typography as="h2" variant="titleMd">
					Meetings
				</Typography>
				<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
					<InlineButton
						variant="accent"
						size="sm"
						onClick={() => setShowCreateMeeting(true)}
						style={{
							display: "flex",
							alignItems: "center",
							gap: 6,
							padding: "6px 14px",
							fontSize: "0.84rem",
						}}
					>
						<Plus size={16} />
						Create Meeting
					</InlineButton>
					{headerExtra}
				</div>
			</div>

			{meetings.length === 0 ? (
				<EmptyState
					icon={<Video size={48} />}
					title="No meetings yet"
					subtitle="Create a meeting to get started."
				/>
			) : (
				<div style={{ display: "grid", gap: 8 }}>
					{meetings.map((m) => (
						<MeetingItem
							key={m.id}
							meeting={m}
							isSelected={selectedMeetingId === m.id}
							onSelect={onSelectMeeting ? () => onSelectMeeting(m.id) : undefined}
							onRejoin={async () => {
								try {
									const { meetingId } = await roomApi.rejoin({ meetingId: m.id, groupId });
									router.push(`/meet/${meetingId}`);
								} catch (err) {
									console.error("Failed to rejoin meeting:", err);
								}
							}}
							onDelete={() => deleteMeeting(m.id)}
						/>
					))}
				</div>
			)}
		</div>
	);
}

function MeetingItem({
	meeting,
	isSelected,
	onSelect,
	onRejoin,
	onDelete,
}: {
	meeting: Meeting;
	isSelected?: boolean;
	onSelect?: () => void;
	onRejoin: () => void;
	onDelete: () => void;
}) {
	const [confirmDelete, setConfirmDelete] = useState(false);

	return (
		<EntityListRow
			onClick={onSelect}
			selected={isSelected}
			icon={
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						width: 36,
						height: 36,
						borderRadius: "50%",
						background: "var(--accent-purple)",
						color: "#fff",
					}}
				>
					<Video size={16} />
				</div>
			}
			title={meeting.name}
			subtitle={
				<span style={{ display: "flex", alignItems: "center", gap: 4 }}>
					<CalendarDays size={12} />
					<Typography as="span" variant="meta" tone="tertiary" style={{ color: "inherit" }}>
						{formatDate(meeting.createdAt)}
					</Typography>
				</span>
			}
			actions={
				<>
					<InlineButton
						variant="secondary"
						size="xs"
						onClick={onRejoin}
						title="Rejoin meeting"
						style={{
							display: "flex",
							alignItems: "center",
							gap: 4,
							padding: "6px 10px",
							color: "var(--text-secondary)",
							fontSize: "0.78rem",
							flexShrink: 0,
						}}
					>
						<RotateCcw size={14} />
						Rejoin
					</InlineButton>

					{confirmDelete ? (
						<>
							<InlineButton
								variant="danger"
								size="xs"
								onClick={() => {
									onDelete();
									setConfirmDelete(false);
								}}
								style={{
									padding: "6px 10px",
									fontSize: "0.78rem",
								}}
							>
								Confirm
							</InlineButton>
							<InlineButton
								variant="secondary"
								size="xs"
								onClick={() => setConfirmDelete(false)}
								style={{
									padding: "6px 10px",
									color: "var(--text-secondary)",
									fontSize: "0.78rem",
								}}
							>
								Cancel
							</InlineButton>
						</>
					) : (
						<IconButton
							variant="square"
							size="md"
							onClick={() => setConfirmDelete(true)}
							title="Delete meeting record"
							style={{
								width: 32,
								height: 32,
								border: "1px solid var(--border-default)",
								background: "var(--bg-primary)",
								color: "var(--text-secondary)",
								flexShrink: 0,
							}}
						>
							<Trash2 size={16} />
						</IconButton>
					)}
				</>
			}
		/>
	);
}
