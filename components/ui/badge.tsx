interface BadgeProps {
  label: string;
  color: string;
  style?: React.CSSProperties;
}

export function Badge({ label, color, style }: BadgeProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        fontSize: "0.7rem",
        fontWeight: 600,
        background: color,
        borderRadius: "var(--radius-sm)",
        color: "white",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        ...style,
      }}
    >
      {label}
    </span>
  );
}
