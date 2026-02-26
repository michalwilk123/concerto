"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useEffect, useState } from "react";
import { LoadingIndicator } from "@/components/ui/loading-state";
import VideoRoom from "@/components/VideoRoom";
import { roomApi } from "@/lib/api-client";
import { useSession } from "@/lib/auth-client";
import { useTranslation } from "@/hooks/useTranslation";
import { isTeacher, type Role } from "@/types/room";
import ErrorPhase from "../ErrorPhase";
import NameEntryPhase from "../NameEntryPhase";

export default function MeetKeyPage() {
	return (
		<Suspense>
			<MeetContent />
		</Suspense>
	);
}

function MeetContent() {
	const router = useRouter();
	const { t } = useTranslation();
	const params = useParams<{ key: string }>();
	const searchParams = useSearchParams();
	const { data: authSession, isPending: authPending } = useSession();
	const meetingId = params.key ?? "";
	const guestName = searchParams.get("name") || undefined;
	const [phase, setPhase] = useState<
		"init" | "joining" | "guestJoining" | "nameEntry" | "room" | "error"
	>("init");
	const [participantName, setParticipantName] = useState("");
	const [token, setToken] = useState<string | null>(null);
	const [role, setRole] = useState<Role | null>(null);
	const [groupId, setGroupId] = useState<string | null>(null);
	const [meetingFolderId, setMeetingFolderId] = useState<string | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [autoJoinAttempt, setAutoJoinAttempt] = useState(false);
	const [initialized, setInitialized] = useState(false);

	useEffect(() => {
		if (!meetingId) router.replace("/dashboard");
	}, [meetingId, router]);

	useEffect(() => {
		if (!meetingId || initialized) return;
		let cancelled = false;
		(async () => {
			const stored = sessionStorage.getItem("concerto-session");
			if (stored) {
				sessionStorage.removeItem("concerto-session");
				try {
					const session = JSON.parse(stored);
					// Only use the stored name to skip name-entry; always re-join to get a
					// fresh token tied to the current RTK meeting. Using the stored token
					// directly can place the user in a stale/different RTK meeting if the
					// meeting was restarted between sessions.
					if (session?.meetingId === meetingId && session?.participantName && !cancelled) {
						setParticipantName(session.participantName);
						// Fall through to normal auth-based join below
					}
				} catch {
					// Ignore invalid session payload.
				}
			}
			if (guestName) {
				if (!cancelled) {
					setParticipantName(guestName);
					setPhase("guestJoining");
				}
				setInitialized(true);
				return;
			}
			if (!authPending) {
				const userName = authSession?.user?.name ?? null;
				if (userName && !cancelled) {
					setParticipantName(userName);
					setAutoJoinAttempt(true);
					setPhase("joining");
				} else if (!cancelled) {
					setPhase("nameEntry");
				}
				setInitialized(true);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [meetingId, initialized, guestName, authPending, authSession]);

	useEffect(() => {
		if (!meetingId) return;
		let cancelled = false;
		const run = async () => {
			try {
				const result =
					phase === "guestJoining"
						? await roomApi.guestJoin({ meetingId, participantName })
						: await roomApi.join({ meetingId, participantName });
				if (cancelled) return;
				setToken(result.token ?? null);
				setRole((result.role || "student") as Role);
				setGroupId(result.groupId ?? null);
				setMeetingFolderId(result.meetingFolderId ?? null);
				setErrorMessage(null);
				setPhase("room");
			} catch (error) {
				if (cancelled) return;
				const message = error instanceof Error ? error.message : t("room.error.generic");
				if (phase === "joining" && autoJoinAttempt) {
					setPhase("nameEntry");
					return;
				}
				if (phase === "guestJoining") {
					// Private meeting blocks guests — show error page, not name re-entry
					if (message.includes("private") || message.includes("group member")) {
						setErrorMessage(t("room.error.privateMeeting"));
						setPhase("error");
						return;
					}
					setErrorMessage(message);
					setPhase("nameEntry");
					return;
				}
				// Group membership required
				if (message.includes("Group membership required")) {
					setErrorMessage(t("room.error.notGroupMember"));
					setPhase("error");
					return;
				}
				setErrorMessage(message);
				setPhase("error");
			} finally {
				setAutoJoinAttempt(false);
			}
		};
		if ((phase === "joining" || phase === "guestJoining") && participantName) {
			run();
		}
		return () => {
			cancelled = true;
		};
	}, [phase, meetingId, participantName, autoJoinAttempt, t]);

	// Persist session to sessionStorage so it survives page refreshes
	useEffect(() => {
		if (phase !== "room" || !token) return;
		const save = () => {
			sessionStorage.setItem(
				"concerto-session",
				JSON.stringify({ token, meetingId, participantName, role, groupId, meetingFolderId }),
			);
		};
		window.addEventListener("beforeunload", save);
		return () => window.removeEventListener("beforeunload", save);
	}, [phase, token, meetingId, participantName, role, groupId, meetingFolderId]);

	if (phase === "room" && token && role && groupId) {
		return (
			<VideoRoom
				token={token}
				meetingId={meetingId}
				participantName={participantName}
				role={role}
				groupId={groupId}
				meetingFolderId={meetingFolderId ?? undefined}
				onLeave={() => {
					if (role && isTeacher(role)) {
						roomApi.adminLeave({ meetingId }).catch(() => {});
					}
					window.location.href = "/lobby";
				}}
				onRoomStateChange={(roomState: string) => {
					if (roomState === "kicked") {
						window.location.href = "/lobby?kicked=true";
					}
				}}
			/>
		);
	}

	if (phase === "joining" || phase === "guestJoining" || phase === "init") {
		return <LoadingIndicator fullscreen message={t("room.joining")} />;
	}

	if (phase === "error") {
		return (
			<ErrorPhase
				message={errorMessage || t("room.error.generic")}
				onRetry={() => setPhase("nameEntry")}
				onBack={() => router.push("/dashboard")}
			/>
		);
	}

	return (
		<NameEntryPhase
			meetingId={meetingId}
			participantName={participantName}
			onParticipantNameChange={setParticipantName}
			onSubmit={(e: FormEvent) => {
				e.preventDefault();
				if (participantName) {
					setAutoJoinAttempt(false);
					setPhase(authSession ? "joining" : "guestJoining");
				}
			}}
			onBack={() => router.push("/dashboard")}
		/>
	);
}
