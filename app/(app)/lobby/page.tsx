"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { useToast } from "@/components/Toast";
import { InlineButton } from "@/components/ui/inline-button";
import { roomApi } from "@/lib/api-client";
import { useSession } from "@/lib/auth-client";

export default function LobbyPage() {
	return (
		<Suspense>
			<LobbyContent />
		</Suspense>
	);
}

function LobbyContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const toast = useToast();
	const joinKey = searchParams.get("key")?.toUpperCase() || "";
	const { data: session } = useSession();
	const isAdmin = session?.user?.role === "admin";

	useEffect(() => {
		if (joinKey) {
			router.replace(`/meet?key=${joinKey}`);
		}
	}, [joinKey, router]);

	useEffect(() => {
		if (searchParams.get("kicked") === "true") {
			toast.warning("You were kicked from the room");
			router.replace("/lobby");
		}
	}, [router.replace, searchParams.get, toast.warning]);

	const handleCreateRoom = async () => {
		const participantName = session?.user?.name;
		if (!participantName) return;

		try {
			const createData = await roomApi.create({ displayName: participantName });
			const roomKey = createData.roomKey;

			const joinData = await roomApi.join({ roomKey, participantName });

			sessionStorage.setItem(
				"concerto-session",
				JSON.stringify({
					token: joinData.token,
					livekitUrl: joinData.livekitUrl,
					roomKey,
					participantName,
					role: joinData.role || "admin",
				}),
			);

			router.push(`/meet?key=${roomKey}`);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "An error occurred");
		}
	};

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				flex: 1,
				gap: "var(--space-2xl)",
				background: "var(--bg-primary)",
			}}
		>
			<div style={{ textAlign: "center" }}>
				<p
					style={{
						color: "var(--text-secondary)",
						fontSize: "1rem",
						margin: 0,
						maxWidth: 360,
					}}
				>
					Collaborative music education platform for universities
				</p>
			</div>

			<div style={{ display: "flex", gap: "var(--space-md)" }}>
				{isAdmin && (
					<InlineButton variant="primary" size="lg" onClick={handleCreateRoom}>
						Create Room
					</InlineButton>
				)}
				<InlineButton variant="secondary" size="lg" onClick={() => router.push("/meet")}>
					Join Room
				</InlineButton>
			</div>
		</div>
	);
}
