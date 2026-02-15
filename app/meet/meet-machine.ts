import { DisconnectReason } from "livekit-client";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { assign, type EventObject, fromCallback, fromPromise, setup } from "xstate";
import { roomApi } from "@/lib/api-client";
import type { Role } from "@/types/room";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ToastAPI {
	success: (message: string, duration?: number) => void;
	error: (message: string, duration?: number) => void;
	warning: (message: string, duration?: number) => void;
	info: (message: string, duration?: number) => void;
}

export interface MeetMachineContext {
	roomKey: string;
	participantName: string;
	token: string | null;
	livekitUrl: string | null;
	role: Role | null;
	requestId: string | null;
	errorMessage: string | null;
	autoJoinAttempt: boolean;
	// Non-serializable refs stored in context for action access
	router: AppRouterInstance;
	toast: ToastAPI;
}

export interface MeetMachineInput {
	roomKey: string;
	router: AppRouterInstance;
	toast: ToastAPI;
}

type SessionResult =
	| { type: "waiting"; roomKey: string; requestId: string; participantName: string }
	| {
			type: "room";
			token: string;
			livekitUrl: string;
			roomKey: string;
			participantName: string;
			role: Role;
	  }
	| { type: "empty" };

// ─── Actors ─────────────────────────────────────────────────────────────────

const checkSession = fromPromise<SessionResult>(async () => {
	const stored = sessionStorage.getItem("concerto-session");
	if (!stored) return { type: "empty" };

	sessionStorage.removeItem("concerto-session");
	try {
		const session = JSON.parse(stored);
		if (session.waiting) {
			return {
				type: "waiting",
				roomKey: session.roomKey,
				requestId: session.requestId,
				participantName: session.participantName,
			};
		}
		if (session.token) {
			return {
				type: "room",
				token: session.token,
				livekitUrl: session.livekitUrl,
				roomKey: session.roomKey,
				participantName: session.participantName,
				role: session.role,
			};
		}
	} catch {
		// invalid JSON, treat as empty
	}
	return { type: "empty" };
});

const joinRoom = fromPromise<
	{ status?: "waiting"; requestId?: string; token?: string; livekitUrl?: string; role?: Role },
	{ roomKey: string; participantName: string }
>(async ({ input }) => {
	return roomApi.join({ roomKey: input.roomKey, participantName: input.participantName });
});

const pollApproval = fromCallback<EventObject, { roomKey: string; requestId: string }>(
	({ sendBack, input }) => {
		const interval = setInterval(async () => {
			try {
				const data = await roomApi.checkApproval({
					roomKey: input.roomKey,
					requestId: input.requestId,
				});
				if (data.status === "approved" && data.token) {
					sendBack({
						type: "APPROVAL_GRANTED",
						token: data.token,
						livekitUrl: data.livekitUrl,
					});
				} else if (data.status === "rejected") {
					sendBack({ type: "APPROVAL_REJECTED" });
				}
			} catch {
				// retry on next poll
			}
		}, 2500);

		return () => clearInterval(interval);
	},
);

// ─── Machine ────────────────────────────────────────────────────────────────

export const meetMachine = setup({
	types: {
		context: {} as MeetMachineContext,
		input: {} as MeetMachineInput,
		events: {} as
			| { type: "AUTH_UPDATE"; userName: string | null; isPending: boolean }
			| { type: "SUBMIT_JOIN"; participantName: string }
			| { type: "BACK_TO_LOBBY" }
			| { type: "APPROVAL_GRANTED"; token: string; livekitUrl: string }
			| { type: "APPROVAL_REJECTED" }
			| { type: "CANCEL_WAITING" }
			| { type: "LEAVE" }
			| { type: "DISCONNECTED"; reason?: DisconnectReason }
			| { type: "RETRY" },
	},
	actors: {
		checkSession,
		joinRoom,
		pollApproval,
	},
	actions: {
		navigateToLobby: ({ context }) => {
			context.router.push("/lobby");
		},
		navigateToLobbyKicked: ({ context }) => {
			context.router.push("/lobby?kicked=true");
		},
		showRejectionToast: ({ context }) => {
			context.toast.warning("Your request to join was rejected by a moderator");
		},
		conditionalAdminLeave: ({ context }) => {
			if (context.role === "admin") {
				roomApi.adminLeave({ roomKey: context.roomKey }).catch(() => {});
			}
		},
	},
	guards: {
		isAuthStillPending: ({ event }) => {
			return (event as Extract<typeof event, { type: "AUTH_UPDATE" }>).isPending;
		},
		hasAuthUserName: ({ event }) => {
			const e = event as Extract<typeof event, { type: "AUTH_UPDATE" }>;
			return !e.isPending && !!e.userName;
		},
		noAuthUser: ({ event }) => {
			const e = event as Extract<typeof event, { type: "AUTH_UPDATE" }>;
			return !e.isPending && !e.userName;
		},
		isAutoJoinAttempt: ({ context }) => context.autoJoinAttempt,
		wasKicked: ({ event }) => {
			return (
				(event as Extract<typeof event, { type: "DISCONNECTED" }>).reason ===
				DisconnectReason.PARTICIPANT_REMOVED
			);
		},
	},
}).createMachine({
	id: "meet",
	context: ({ input }) => ({
		roomKey: input.roomKey,
		participantName: "",
		token: null,
		livekitUrl: null,
		role: null,
		requestId: null,
		errorMessage: null,
		autoJoinAttempt: false,
		router: input.router,
		toast: input.toast,
	}),
	initial: "init",
	states: {
		init: {
			initial: "checkingSession",
			states: {
				checkingSession: {
					invoke: {
						src: "checkSession",
						onDone: [
							{
								guard: ({ event }) => event.output.type === "waiting",
								target: "#meet.waiting",
								actions: assign(({ event }) => {
									const out = event.output as Extract<SessionResult, { type: "waiting" }>;
									return {
										requestId: out.requestId,
										participantName: out.participantName,
										roomKey: out.roomKey,
									};
								}),
							},
							{
								guard: ({ event }) => event.output.type === "room",
								target: "#meet.room",
								actions: assign(({ event }) => {
									const out = event.output as Extract<SessionResult, { type: "room" }>;
									return {
										token: out.token,
										livekitUrl: out.livekitUrl,
										participantName: out.participantName,
										roomKey: out.roomKey,
										role: out.role,
									};
								}),
							},
							{ target: "checkingAuth" },
						],
						onError: { target: "checkingAuth" },
					},
				},
				checkingAuth: {
					on: {
						AUTH_UPDATE: [
							{ guard: "isAuthStillPending" },
							{
								guard: "hasAuthUserName",
								target: "#meet.joining",
								actions: assign({
									participantName: ({ event }) => event.userName!,
									autoJoinAttempt: true,
								}),
							},
							{
								guard: "noAuthUser",
								target: "#meet.nameEntry",
							},
						],
					},
				},
			},
		},

		nameEntry: {
			on: {
				SUBMIT_JOIN: {
					target: "joining",
					actions: assign({
						participantName: ({ event }) => event.participantName,
						autoJoinAttempt: false,
					}),
				},
				BACK_TO_LOBBY: { actions: "navigateToLobby" },
			},
		},

		joining: {
			invoke: {
				src: "joinRoom",
				input: ({ context }) => ({
					roomKey: context.roomKey,
					participantName: context.participantName,
				}),
				onDone: [
					{
						guard: ({ event }) => event.output.status === "waiting",
						target: "waiting",
						actions: assign({
							requestId: ({ event }) => event.output.requestId ?? null,
						}),
					},
					{
						target: "room",
						actions: assign({
							token: ({ event }) => event.output.token ?? null,
							livekitUrl: ({ event }) => event.output.livekitUrl ?? null,
							role: ({ event }) => (event.output.role || "participant") as Role,
						}),
					},
				],
				onError: [
					{
						guard: "isAutoJoinAttempt",
						target: "nameEntry",
					},
					{
						target: "error",
						actions: assign({
							errorMessage: ({ event }) =>
								event.error instanceof Error ? event.error.message : "An error occurred",
						}),
					},
				],
			},
		},

		waiting: {
			invoke: {
				src: "pollApproval",
				input: ({ context }) => ({
					roomKey: context.roomKey,
					requestId: context.requestId!,
				}),
			},
			on: {
				APPROVAL_GRANTED: {
					target: "room",
					actions: assign({
						token: ({ event }) => event.token,
						livekitUrl: ({ event }) => event.livekitUrl,
						role: "participant" as Role,
					}),
				},
				APPROVAL_REJECTED: {
					actions: ["showRejectionToast", "navigateToLobby"],
				},
				CANCEL_WAITING: {
					actions: "navigateToLobby",
				},
			},
		},

		room: {
			on: {
				LEAVE: {
					actions: ["conditionalAdminLeave", "navigateToLobby"],
				},
				DISCONNECTED: {
					guard: "wasKicked",
					actions: "navigateToLobbyKicked",
				},
			},
		},

		error: {
			on: {
				RETRY: { target: "nameEntry" },
				BACK_TO_LOBBY: { actions: "navigateToLobby" },
			},
		},
	},
});
