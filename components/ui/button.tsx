import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/90",
        danger:
          "border-transparent bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        secondary:
          "border-input bg-secondary text-secondary-foreground shadow-sm hover:bg-accent hover:text-accent-foreground",
        ghost:
          "border-transparent bg-transparent text-foreground shadow-none hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        md: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
  loading?: boolean;
}

const Spinner = () => (
  <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
  </svg>
);

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      disabled,
      iconEnd,
      iconStart,
      loading = false,
      variant,
      size,
      asChild = false,
      ...props
    },
    ref,
  ) => {
    const classes = cn(buttonVariants({ variant, size, className }));

    // asChild merges onto a single child (e.g. a <Link>); icon/loading slots and the
    // disabled attribute don't apply, and extra slots would break Radix Slot's single-child rule.
    if (asChild) {
      return (
        <Slot className={classes} ref={ref} {...props}>
          {children}
        </Slot>
      );
    }

    return (
      <button className={classes} disabled={disabled || loading} ref={ref} {...props}>
        {loading ? <Spinner /> : iconStart}
        {children}
        {iconEnd}
      </button>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
