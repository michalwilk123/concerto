"use client";

import { useEffect, useState } from "react";
import { InlineButton } from "@/components/ui/inline-button";
import { roomApi } from "@/lib/api-client";
import { useRoomStore } from "@/stores/room-store";

export default function ModerationPanel() {
	const { roomKey, participantName } = useRoomStore();
	const [waitingList, setWaitingList] = useState<
		{ requestId: string; name: string; timestamp: number }[]
	>([]);

	const fetchWaitingList = async () => {
		try {
			const list = await roomApi.getWaitingList({ roomKey, participantName });
			setWaitingList(list);
		} catch {
			// ignore
		}
	};

	useEffect(() => {
		fetchWaitingList();
		const interval = setInterval(fetchWaitingList, 3000);
		return () => clearInterval(interval);
	}, [fetchWaitingList]);

	const handleApprove = async (requestId: string) => {
		try {
			await roomApi.approve({ roomKey, requestId, participantName });
			fetchWaitingList();
		} catch {
			// ignore
		}
	};

	const handleReject = async (requestId: string) => {
		try {
			await roomApi.reject({ roomKey, requestId, participantName });
			fetchWaitingList();
		} catch {
			// ignore
		}
	};

	return (
		<div
			style={{
				flex: 1,
				overflowY: "auto",
				padding: "var(--space-lg)",
			}}
		>
			{waitingList.length === 0 ? (
				<p
					style={{
						color: "var(--text-tertiary)",
						textAlign: "center",
						margin: "var(--space-2xl) 0",
						fontSize: "0.875rem",
					}}
				>
					No participants waiting
				</p>
			) : (
				<div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
					{waitingList.map((participant) => (
						<div
							key={participant.requestId}
							style={{
								background: "var(--bg-tertiary)",
								padding: "var(--space-md)",
								borderRadius: "var(--radius-md)",
							}}
						>
							<div
								style={{ marginBottom: "var(--space-xs)", fontWeight: 600, fontSize: "0.875rem" }}
							>
								{participant.name}
							</div>
							<div
								style={{
									fontSize: "0.75rem",
									color: "var(--text-tertiary)",
									marginBottom: "var(--space-sm)",
								}}
							>
								{new Date(participant.timestamp).toLocaleTimeString()}
							</div>
							<div style={{ display: "flex", gap: "var(--space-sm)" }}>
								<InlineButton
									variant="success"
									size="sm"
									onClick={() => handleApprove(participant.requestId)}
									style={{ flex: 1, borderRadius: "var(--radius-sm)" }}
								>
									Approve
								</InlineButton>
								<InlineButton
									variant="danger"
									size="sm"
									onClick={() => handleReject(participant.requestId)}
									style={{ flex: 1, borderRadius: "var(--radius-sm)" }}
								>
									Reject
								</InlineButton>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
