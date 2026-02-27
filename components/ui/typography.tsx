"use client";

import type { ComponentPropsWithoutRef, CSSProperties, ElementType, ReactNode } from "react";

const variantStyles: Record<string, CSSProperties> = {
  pageTitle: { fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em" },
  titleLg: { fontSize: "1.25rem", fontWeight: 600 },
  titleMd: { fontSize: "1.1rem", fontWeight: 600 },
  body: { fontSize: "0.875rem" },
  bodySm: { fontSize: "0.84rem" },
  caption: { fontSize: "0.8rem" },
  meta: { fontSize: "0.78rem" },
  tiny: { fontSize: "0.75rem" },
  label: {
    fontSize: "0.76rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  overline: {
    fontSize: "0.7rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
};

const toneStyles: Record<string, CSSProperties> = {
  primary: { color: "var(--text-primary)" },
  secondary: { color: "var(--text-secondary)" },
  tertiary: { color: "var(--text-tertiary)" },
  danger: { color: "var(--accent-red)" },
  success: { color: "var(--accent-green)" },
};

type TypographyVariant = keyof typeof variantStyles;
type TypographyTone = keyof typeof toneStyles;

type TypographyProps<E extends ElementType> = {
  as?: E;
  variant?: TypographyVariant;
  tone?: TypographyTone;
  weight?: CSSProperties["fontWeight"];
  truncate?: boolean;
  children: ReactNode;
  style?: CSSProperties;
} & Omit<ComponentPropsWithoutRef<E>, "as" | "children" | "style" | "color">;

export function Typography<E extends ElementType = "span">({
  as,
  variant = "body",
  tone = "primary",
  weight,
  truncate = false,
  children,
  style,
  ...rest
}: TypographyProps<E>) {
  const Component = (as ?? "span") as ElementType;

  return (
    <Component
      style={{
        ...variantStyles[variant],
        ...toneStyles[tone],
        ...(weight ? { fontWeight: weight } : undefined),
        ...(truncate
          ? {
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }
          : undefined),
        ...style,
      }}
      {...rest}
    >
      {children}
    </Component>
  );
}
