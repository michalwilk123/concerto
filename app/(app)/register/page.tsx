"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { InlineButton } from "@/components/ui/inline-button";
import { signUp } from "@/lib/auth-client";

export default function RegisterPage() {
	const router = useRouter();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		setError("");

		if (password !== confirmPassword) {
			setError("Passwords do not match");
			return;
		}

		setLoading(true);

		const result = await signUp.email({ email, password, name });

		if (result.error) {
			setError(result.error.message || "Registration failed");
			setLoading(false);
		} else {
			router.push("/dashboard");
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
				<h2 style={{ margin: "0 0 var(--space-xl)", fontSize: "1.25rem" }}>Create Account</h2>

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
							htmlFor="name"
							style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 500 }}
						>
							Full Name
						</label>
						<input
							id="name"
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g. Jan Kowalski"
							autoComplete="name"
							required
						/>
					</div>

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
							autoComplete="email"
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
							autoComplete="new-password"
							required
						/>
					</div>

					<div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xs)" }}>
						<label
							htmlFor="confirmPassword"
							style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 500 }}
						>
							Confirm Password
						</label>
						<input
							id="confirmPassword"
							type="password"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							autoComplete="new-password"
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
						{loading ? "Creating account..." : "Create Account"}
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
					Already have an account? <a href="/login">Sign In</a>
				</p>
			</div>
		</div>
	);
}
