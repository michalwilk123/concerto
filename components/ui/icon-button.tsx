import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "circle" | "square";
  size?: "xs" | "sm" | "md" | "lg";
  tone?: "neutral" | "primary" | "danger";
  children: ReactNode;
}

export function IconButton({
  variant = "circle",
  size = "md",
  tone = "neutral",
  children,
  className,
  ...rest
}: IconButtonProps) {
  const sizeClass = {
    xs: "h-6 w-6 [&_svg]:size-3.5",
    sm: "h-7 w-7 [&_svg]:size-4",
    md: "h-8 w-8 [&_svg]:size-4",
    lg: "h-12 w-12 [&_svg]:size-5",
  }[size];
  const toneClass = {
    neutral:
      "border-transparent bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground",
    primary: "border-transparent bg-primary text-primary-foreground hover:bg-primary/90",
    danger:
      "border-transparent bg-transparent text-destructive hover:bg-destructive hover:text-destructive-foreground",
  }[tone];

  return (
    <button
      className={cn(
        "inline-flex shrink-0 items-center justify-center border p-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
        variant === "circle" ? "rounded-full" : "rounded-sm",
        sizeClass,
        toneClass,
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
