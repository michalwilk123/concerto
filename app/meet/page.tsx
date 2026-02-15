"use client";

import { useMachine } from "@xstate/react";
import type { DisconnectReason } from "livekit-client";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useEffect, useState } from "react";
import { useToast } from "@/components/Toast";
import Spinner from "@/components/ui/spinner";
import VideoRoom from "@/components/VideoRoom";
import { useSession } from "@/lib/auth-client";
import ErrorPhase from "./ErrorPhase";
import { meetMachine } from "./meet-machine";
import NameEntryPhase from "./NameEntryPhase";
import WaitingPhase from "./WaitingPhase";

export default function MeetPage() {
	return (
		<Suspense>
			<MeetContent />
		</Suspense>
	);
}

function MeetContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const toast = useToast();
	const { data: authSession, isPending: authPending } = useSession();
	const roomKey = searchParams.get("key")?.toUpperCase() || "";

	// Redirect if no roomKey (before machine creation)
	useEffect(() => {
		if (!roomKey) router.replace("/lobby");
	}, [roomKey, router]);

	const [state, send] = useMachine(meetMachine, {
		input: { roomKey, router, toast },
	});

	// Bridge auth state into machine
	useEffect(() => {
		send({
			type: "AUTH_UPDATE",
			userName: authSession?.user?.name ?? null,
			isPending: authPending,
		});
	}, [authSession, authPending, send]);

	const { context } = state;

	// Local form state for the name input (pre-filled when auto-join fails)
	const [participantName, setParticipantName] = useState("");

	// Sync name from machine context when auto-join fails and falls back to nameEntry
	useEffect(() => {
		if (state.matches("nameEntry") && context.participantName && !participantName) {
			setParticipantName(context.participantName);
		}
	}, [state, context.participantName, participantName]);

	if (state.matches("room") && context.token && context.livekitUrl && context.role) {
		return (
			<VideoRoom
				token={context.token}
				livekitUrl={context.livekitUrl}
				roomKey={context.roomKey}
				participantName={context.participantName}
				role={context.role}
				onLeave={() => send({ type: "LEAVE" })}
				onDisconnected={(reason?: DisconnectReason) => send({ type: "DISCONNECTED", reason })}
			/>
		);
	}

	if (state.matches("waiting")) {
		return (
			<WaitingPhase roomKey={context.roomKey} onCancel={() => send({ type: "CANCEL_WAITING" })} />
		);
	}

	if (state.matches("joining") || state.matches("init")) {
		return (
			<div
				style={{
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
					minHeight: "100vh",
					background: "var(--bg-primary)",
				}}
			>
				<div style={{ textAlign: "center", color: "var(--text-secondary)" }}>
					<div
						style={{ display: "flex", justifyContent: "center", marginBottom: "var(--space-lg)" }}
					>
						<Spinner />
					</div>
					<p style={{ margin: 0, fontSize: "0.9rem" }}>Joining room...</p>
				</div>
			</div>
		);
	}

	if (state.matches("error")) {
		return (
			<ErrorPhase
				message={context.errorMessage || "An error occurred"}
				onRetry={() => send({ type: "RETRY" })}
				onBack={() => send({ type: "BACK_TO_LOBBY" })}
			/>
		);
	}

	return (
		<NameEntryPhase
			roomKey={roomKey}
			participantName={participantName}
			onParticipantNameChange={setParticipantName}
			onSubmit={(e: FormEvent) => {
				e.preventDefault();
				if (participantName) {
					send({ type: "SUBMIT_JOIN", participantName });
				}
			}}
			onBack={() => send({ type: "BACK_TO_LOBBY" })}
		/>
	);
}
