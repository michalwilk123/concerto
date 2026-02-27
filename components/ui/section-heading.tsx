import type { ReactNode } from "react";

interface SectionHeadingProps {
  children: ReactNode;
  count?: number;
  uppercase?: boolean;
  icon?: ReactNode;
  style?: React.CSSProperties;
}

export function SectionHeading({
  children,
  count,
  uppercase = true,
  icon,
  style,
}: SectionHeadingProps) {
  return (
    <div
      style={{
        fontSize: "0.7rem",
        fontWeight: 600,
        color: "var(--text-secondary)",
        letterSpacing: "0.05em",
        textTransform: uppercase ? "uppercase" : undefined,
        display: "flex",
        alignItems: "center",
        gap: "var(--space-xs)",
        ...style,
      }}
    >
      {icon}
      <span>
        {children}
        {count != null && ` (${count})`}
      </span>
    </div>
  );
}
