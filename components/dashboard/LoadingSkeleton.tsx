"use client";

const bar = (width: string): React.CSSProperties => ({
  height: 12,
  width,
  borderRadius: "var(--radius-sm)",
  background: "var(--bg-elevated)",
});

export function LoadingSkeleton() {
  return (
    <>
      <style>{`
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
      <div>
        {/* Header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "28px 28px 1fr 110px 110px 70px 36px",
            alignItems: "center",
            height: 36,
            padding: "0 8px",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div />
          <div />
          <div style={bar("48px")} />
          <div style={bar("40px")} />
          <div style={bar("44px")} />
          <div style={bar("32px")} />
          <div />
        </div>

        {/* Rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: 1, paddingTop: 2 }}>
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "28px 28px 1fr 110px 110px 70px 60px",
                alignItems: "center",
                height: 44,
                padding: "0 8px",
                animation: "skeleton-pulse 1.5s ease-in-out infinite",
                animationDelay: `${i * 0.08}s`,
              }}
            >
              {/* Grip */}
              <div />
              {/* Checkbox */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 15, height: 15, borderRadius: 3, background: "var(--bg-elevated)" }} />
              </div>
              {/* Name with icon */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, paddingRight: 8 }}>
                <div style={{ width: 16, height: 16, borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", flexShrink: 0 }} />
                <div style={bar(i % 3 === 0 ? "60%" : i % 3 === 1 ? "45%" : "70%")} />
              </div>
              {/* Date */}
              <div style={bar("72px")} />
              {/* Author */}
              <div style={bar("64px")} />
              {/* Size */}
              <div style={{ display: "flex", justifyContent: "flex-end", paddingRight: 4 }}>
                <div style={bar(i % 2 === 0 ? "40px" : "48px")} />
              </div>
              {/* Actions */}
              <div />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
