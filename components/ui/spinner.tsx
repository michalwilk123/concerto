"use client";

const spinKeyframes = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

interface SpinnerProps {
  size?: number;
  className?: string;
}

export default function Spinner({ size = 48 }: SpinnerProps) {
  return (
    <>
      <style>{spinKeyframes}</style>
      <div
        style={{
          width: size,
          height: size,
          border: "3px solid var(--border-default)",
          borderTop: "3px solid var(--accent-blue)",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }}
      />
    </>
  );
}
