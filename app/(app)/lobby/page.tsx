"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { useToast } from "@/components/Toast";
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
	const { data: session } = useSession();
	const joinKey = searchParams.get("key")?.toUpperCase() || "";

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
					You are in the lobby. Waiting for the meeting to start.
				</p>
			</div>

		</div>
	);
}
