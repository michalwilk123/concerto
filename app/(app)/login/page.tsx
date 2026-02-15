"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { InlineButton } from "@/components/ui/inline-button";
import { signIn } from "@/lib/auth-client";

export default function LoginPage() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		setError("");
		setLoading(true);

		const result = await signIn.email({ email, password });

		if (result.error) {
			setError(result.error.message || "Sign in failed");
			setLoading(false);
		} else {
			router.push("/lobby");
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
				background: "var(--bg-primary)",
			}}
		>
			<div
				style={{
					background: "var(--bg-secondary)",
					borderRadius: "var(--radius-lg)",
					border: "1px solid var(--border-subtle)",
					padding: "var(--space-2xl)",
					width: "100%",
					maxWidth: 380,
				}}
			>
				<h2 style={{ margin: "0 0 var(--space-xl)", fontSize: "1.25rem" }}>Sign In</h2>

				{error && (
					<p
						style={{
							color: "var(--accent-red)",
							fontSize: "0.85rem",
							margin: "0 0 var(--space-lg)",
						}}
					>
						{error}
					</p>
				)}

				<form
					onSubmit={handleSubmit}
					style={{
						display: "flex",
						flexDirection: "column",
						gap: "var(--space-lg)",
					}}
				>
					<div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
						<label
							htmlFor="email"
							style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 500 }}
						>
							Email
						</label>
						<input
							id="email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="you@example.com"
							required
						/>
					</div>

					<div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
						<label
							htmlFor="password"
							style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 500 }}
						>
							Password
						</label>
						<input
							id="password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
						/>
					</div>

					<InlineButton
						variant="primary"
						size="lg"
						type="submit"
						loading={loading}
						fullWidth
						style={{ fontWeight: 600, marginTop: "var(--space-sm)", padding: "var(--space-md)" }}
					>
						{loading ? "Signing in..." : "Sign In"}
					</InlineButton>
				</form>

				<p
					style={{
						textAlign: "center",
						marginTop: "var(--space-xl)",
						marginBottom: 0,
						fontSize: "0.85rem",
						color: "var(--text-secondary)",
					}}
				>
					Don&apos;t have an account? <a href="/register">Register</a>
				</p>
			</div>
		</div>
	);
}
