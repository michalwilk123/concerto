"use client";

export function LoadingSkeleton() {
	return (
		<>
			<style>{`
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
					gap: 16,
				}}
			>
				{[...Array(8)].map((_, i) => (
					<div
						key={i}
						style={{
							borderRadius: "var(--radius-lg)",
							border: "1px solid var(--border-subtle)",
							background: "var(--bg-tertiary)",
							padding: 16,
							animation: "skeleton-pulse 1.5s ease-in-out infinite",
						}}
					>
						<div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
							<div
								style={{
									width: 32,
									height: 32,
									borderRadius: "var(--radius-sm)",
									background: "var(--bg-elevated)",
								}}
							/>
							<div style={{ flex: 1 }}>
								<div
									style={{
										height: 14,
										width: "75%",
										borderRadius: "var(--radius-sm)",
										background: "var(--bg-elevated)",
										marginBottom: 8,
									}}
								/>
								<div
									style={{
										height: 10,
										width: "50%",
										borderRadius: "var(--radius-sm)",
										background: "var(--bg-elevated)",
										marginBottom: 6,
									}}
								/>
								<div
									style={{
										height: 10,
										width: "33%",
										borderRadius: "var(--radius-sm)",
										background: "var(--bg-elevated)",
									}}
								/>
							</div>
						</div>
					</div>
				))}
			</div>
		</>
	);
}
