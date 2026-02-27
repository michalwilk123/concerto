interface ProgressBarProps {
  value: number;
  color?: string;
  height?: number;
  animate?: boolean;
  style?: React.CSSProperties;
}

export function ProgressBar({
  value,
  color = "var(--accent-green)",
  height = 6,
  animate = true,
  style,
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      style={{
        width: "100%",
        height,
        background: "var(--bg-elevated)",
        borderRadius: height / 2,
        overflow: "hidden",
        position: "relative",
        ...style,
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${pct}%`,
          background: color,
          borderRadius: height / 2,
          transition: animate ? "width 0.3s" : "none",
        }}
      />
    </div>
  );
}
