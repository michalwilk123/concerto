"use client";

import { useEffect, useState } from "react";
import { InlineButton } from "@/components/ui/inline-button";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { TextInput } from "@/components/ui/text-input";
import { Typography } from "@/components/ui/typography";
import { groupsApi, roomApi } from "@/lib/api-client";
import type { Group } from "@/types/group";

interface CreateMeetingModalProps {
	open: boolean;
	onClose: () => void;
	onCreated: (meetingId: string) => void;
	defaultName?: string;
}

export function CreateMeetingModal({
	open,
	onClose,
	onCreated,
	defaultName = "",
}: CreateMeetingModalProps) {
	const [meetingName, setMeetingName] = useState(defaultName);
	const [groupId, setGroupId] = useState("");
	const [groups, setGroups] = useState<Group[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [fetchingGroups, setFetchingGroups] = useState(false);

	useEffect(() => {
		if (!open) return;
		setError(null);
		setFetchingGroups(true);
		groupsApi
			.list()
			.then((g) => {
				setGroups(g);
				if (g.length > 0 && !groupId) setGroupId(g[0].id);
			})
			.catch(() => setError("Failed to load groups"))
			.finally(() => setFetchingGroups(false));
	}, [open, groupId]);

	useEffect(() => {
		if (open) {
			setMeetingName(defaultName);
		}
	}, [open, defaultName]);

	const handleSubmit = async () => {
		if (!meetingName.trim() || !groupId) return;
		setLoading(true);
		setError(null);
		try {
			const data = await roomApi.create({ displayName: meetingName.trim(), groupId });
			onCreated(data.meetingId);
			onClose();
		} catch (e) {
			setError(e instanceof Error ? e.message : "Failed to create meeting");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Modal open={open} onClose={onClose} maxWidth={420}>
			<div style={{ padding: 24 }}>
				<Typography as="h2" variant="titleMd" style={{ margin: "0 0 20px 0" }}>
					Create Meeting
				</Typography>

				{error && (
					<div
						style={{
							padding: "8px 12px",
							marginBottom: 16,
							background: "rgba(239,68,68,0.08)",
							border: "1px solid rgba(239,68,68,0.2)",
							borderRadius: "var(--radius-md)",
							color: "#f87171",
							fontSize: "0.82rem",
						}}
					>
						{error}
					</div>
				)}

				<label htmlFor="create-meeting-name" style={{ display: "block", marginBottom: 6 }}>
					<Typography as="span" variant="label" tone="secondary">
						Meeting Name
					</Typography>
				</label>
				<TextInput
					id="create-meeting-name"
					value={meetingName}
					onChange={(e) => setMeetingName(e.target.value)}
					placeholder="e.g. Piano Masterclass"
					style={{ width: "100%", marginBottom: 16, fontSize: "0.84rem" }}
				/>

				<label htmlFor="create-meeting-group" style={{ display: "block", marginBottom: 6 }}>
					<Typography as="span" variant="label" tone="secondary">
						Group
					</Typography>
				</label>
				{fetchingGroups ? (
					<Typography as="p" variant="bodySm" tone="tertiary" style={{ margin: "0 0 16px" }}>
						Loading groups...
					</Typography>
				) : groups.length === 0 ? (
					<Typography as="p" variant="bodySm" tone="tertiary" style={{ margin: "0 0 16px" }}>
						No groups available. Ask an admin to create one.
					</Typography>
				) : (
					<Select
						id="create-meeting-group"
						value={groupId}
						onChange={(e) => setGroupId(e.target.value)}
						style={{
							width: "100%",
							marginBottom: 16,
						}}
					>
						{groups.map((g) => (
							<option key={g.id} value={g.id}>
								{g.name}
							</option>
						))}
					</Select>
				)}

				<div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
					<InlineButton variant="secondary" size="sm" onClick={onClose}>
						Cancel
					</InlineButton>
					<InlineButton
						variant="primary"
						size="sm"
						onClick={handleSubmit}
						loading={loading}
						disabled={!meetingName.trim() || !groupId || groups.length === 0}
					>
						Create Meeting
					</InlineButton>
				</div>
			</div>
		</Modal>
	);
}
