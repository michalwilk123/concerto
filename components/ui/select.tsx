"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";
import { logElementVisuals } from "@/lib/visual-debug";

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & {
    variant?: "default" | "compact";
  }
>(({ className, children, variant = "default", ...props }, ref) => {
  const triggerRef = React.useRef<React.ComponentRef<typeof SelectPrimitive.Trigger> | null>(null);
  const sizeClasses =
    variant === "compact"
      ? "h-8 px-2.5 text-[0.8rem]"
      : "h-9 px-3 text-[0.84rem]";

  React.useEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const logLayout = () => {
      logElementVisuals("SelectTrigger", variant, trigger, {
        height: variant === "compact" ? { min: 30, max: 34 } : { min: 34, max: 38 },
        width: { min: variant === "compact" ? 56 : 96, max: window.innerWidth },
        childCount: { min: 2, max: 2 },
        shouldOverflowY: false,
        shouldClipText: false,
      });
    };

    logLayout();
    const resizeObserver = new ResizeObserver(logLayout);
    resizeObserver.observe(trigger);
    return () => resizeObserver.disconnect();
  }, [variant]);

  return (
    <SelectPrimitive.Trigger
      ref={(node) => {
        triggerRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-elevated)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-purple)] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer [&>span]:truncate",
        sizeClasses,
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
});
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectContent = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => {
  const contentRef = React.useRef<React.ComponentRef<typeof SelectPrimitive.Content> | null>(null);

  React.useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const logLayout = () => {
      logElementVisuals("SelectContent", position, content, {
        width: { min: 96, max: window.innerWidth },
        height: { min: 30, max: 288 },
        shouldOverflowX: false,
      });
    };

    logLayout();
    const resizeObserver = new ResizeObserver(logLayout);
    resizeObserver.observe(content);
    return () => resizeObserver.disconnect();
  }, [position]);

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={(node) => {
          contentRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        className={cn(
          "relative z-[9999] max-h-72 min-w-[8rem] overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          position === "popper" && "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className,
        )}
        position={position}
        {...props}
      >
        <SelectPrimitive.Viewport
          className={cn(
            "p-1",
            position === "popper" &&
              "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]",
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
});
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn(
      "px-2 py-1.5 text-xs font-medium text-[var(--text-tertiary)]",
      className,
    )}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-pointer select-none items-center rounded-[var(--radius-sm)] py-1.5 pl-7 pr-2 text-[0.84rem] text-[var(--text-primary)] outline-none transition-colors hover:bg-[var(--bg-tertiary)] focus:bg-[var(--bg-tertiary)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className,
    )}
    {...props}
  >
    <span className="absolute left-1.5 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-3.5 w-3.5 text-[var(--accent-purple)]" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-[var(--border-subtle)]", className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
};
