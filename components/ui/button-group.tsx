"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import type { ReactNode } from "react";
import * as React from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

/**
 * ButtonGroup — the app's universal cluster of buttons / tabs / nav items / toolbar actions.
 *
 * One config-driven component replaces hand-rolled flex rows across the app. Three variants:
 *  - `segmented` (default): zero-gap *joined* boxed control, single-select. The boxed replacement
 *    for the old underline tabs. Active item = filled. Horizontal or vertical.
 *  - `nav`: zero-gap joined vertical sidebar list, single-select, left-aligned. Supports
 *    `kind: "accordion"` items (expandable sections). Active item uses `aria-current`.
 *  - `toolbar`: GAPPED independent actions (modal footers, row edit/delete, media controls).
 *    Each item carries its own `onClick`; styled by `tone` (neutral/primary/danger) not by selection.
 *
 * Responsive: the root establishes a CSS container (`@container`). Segmented/nav groups default
 * to `collapse="container"` so navigation can become icon-only when narrow. Toolbar groups default
 * to `collapse="never"` and do not wrap because work actions should stay text-first and horizontal
 * unless a caller explicitly opts into icon-only behavior.
 */

type Tone = "neutral" | "primary" | "danger";

interface ButtonGroupItemBase {
  id: string;
  /** Already-translated string (caller passes t("...")). Never a raw key. */
  label: string;
  icon?: ReactNode;
  /** Numeric badge; >9 renders as "9+" (matches the old Tabs/MobileTabBar). */
  badge?: number;
  tone?: Tone;
  disabled?: boolean;
  loading?: boolean;
  /** Accessible name; falls back to `label`. Important when the group can collapse to icon-only. */
  ariaLabel?: string;
  /** Per-item escape hatch, merged with cn(). */
  className?: string;
  /** "inline" = icon beside label (default); "stacked" = icon above label (e.g. MobileTabBar). */
  layout?: "inline" | "stacked";
  /** Opt into ellipsized labels for cramped controls. Button labels show full text by default. */
  truncate?: boolean;
}

interface ButtonGroupButtonItem extends ButtonGroupItemBase {
  kind?: "button";
  /** Independent-action handler. In single-select groups, omit and use the group's onSelect. */
  onClick?: () => void;
  /** Native button type. Use "submit" for a form's confirm button. Default "button". */
  type?: "button" | "submit";
  /** Toolbar only: render as a subtle ghost (transparent) button — e.g. row Edit/Delete icons. */
  quiet?: boolean;
  /** Render as a single child (e.g. a <Link>) via Radix Slot. Caller composes the child's content. */
  asChild?: boolean;
  children?: ReactNode;
}

interface ButtonGroupAccordionItem extends ButtonGroupItemBase {
  kind: "accordion";
  /** Revealed on expand — typically a nested <ButtonGroup variant="nav" />. */
  content: ReactNode;
  defaultExpanded?: boolean;
}

export type ButtonGroupItem = ButtonGroupButtonItem | ButtonGroupAccordionItem;

const buttonGroupVariants = cva("flex min-w-0", {
  variants: {
    variant: {
      segmented:
        "items-stretch overflow-hidden rounded-md border border-border bg-background",
      nav: "items-stretch overflow-hidden rounded-sm border border-border bg-background",
      toolbar: "w-max max-w-full flex-nowrap items-center gap-2 border-0 bg-transparent",
    },
    orientation: {
      horizontal: "flex-row",
      vertical: "flex-col",
    },
    grow: {
      true: "[&>*]:flex-1",
      false: "",
    },
  },
  compoundVariants: [
    {
      variant: ["segmented", "nav"],
      orientation: "horizontal",
      class: "[&>*:not(:last-child)]:border-r [&>*:not(:last-child)]:border-border",
    },
    {
      variant: ["segmented", "nav"],
      orientation: "vertical",
      class: "[&>*:not(:last-child)]:border-b [&>*:not(:last-child)]:border-border",
    },
  ],
  defaultVariants: { variant: "segmented", orientation: "horizontal", grow: false },
});

const itemVariants = cva(
  "relative inline-flex min-w-0 cursor-pointer select-none items-center gap-2 whitespace-nowrap border-0 font-medium outline-none transition-colors focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        segmented:
          "justify-center bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        nav: "justify-start text-left text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        toolbar:
          "justify-center rounded-md border border-border bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      },
      size: {
        sm: "h-8 px-3 text-xs [&_svg]:size-4",
        md: "h-9 px-4 text-sm [&_svg]:size-4",
        lg: "h-10 px-5 text-sm [&_svg]:size-5",
      },
      active: { true: "", false: "" },
      tone: { neutral: "", primary: "", danger: "" },
      layout: { inline: "flex-row", stacked: "h-auto flex-col gap-1 py-2" },
      quiet: { true: "", false: "" },
    },
    compoundVariants: [
      // Quiet (ghost) toolbar buttons — subtle row actions.
      {
        variant: "toolbar",
        class: "shrink-0",
      },
      {
        variant: "toolbar",
        quiet: true,
        class:
          "border-transparent bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      },
      {
        variant: "toolbar",
        quiet: true,
        tone: "danger",
        class:
          "border-transparent bg-transparent text-destructive hover:bg-destructive hover:text-destructive-foreground",
      },
      // Filled active state for the joined variants.
      {
        variant: ["segmented", "nav"],
        active: true,
        class: "bg-secondary text-foreground hover:bg-secondary hover:text-foreground",
      },
      // Danger accent on an inactive joined item (rare, e.g. a "Leave" tab).
      {
        variant: ["segmented", "nav"],
        tone: "danger",
        active: false,
        class: "text-destructive hover:text-destructive",
      },
      // Toolbar tones (solid) — independent action buttons. Suppressed when quiet.
      {
        variant: "toolbar",
        tone: "primary",
        quiet: false,
        class:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
      },
      {
        variant: "toolbar",
        tone: "danger",
        quiet: false,
        class:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:text-destructive-foreground",
      },
    ],
    defaultVariants: {
      variant: "segmented",
      size: "md",
      active: false,
      tone: "neutral",
      layout: "inline",
      quiet: false,
    },
  },
);

const Spinner = () => (
  <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z" />
  </svg>
);

const Badge = ({ count }: { count: number }) =>
  count > 0 ? (
    <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">
      {count > 9 ? "9+" : count}
    </span>
  ) : null;

export interface ButtonGroupProps {
  items: ButtonGroupItem[];
  variant?: "segmented" | "nav" | "toolbar";
  size?: "sm" | "md" | "lg";
  orientation?: "horizontal" | "vertical";
  /** Single-select (tab/nav) mode: the id of the active item. */
  activeId?: string;
  /** Called with an item id when a single-select item is chosen. */
  onSelect?: (id: string) => void;
  /** Make items share the available space equally (e.g. a full-width mobile tab bar). */
  grow?: boolean;
  /** Responsive label behavior. Defaults to "container" for nav/segmented and "never" for toolbar. */
  collapse?: "container" | "never" | "icon";
  /** Container width below which icon items collapse to icon-only. Default "md" (~22rem). */
  collapseAt?: "sm" | "md" | "lg";
  className?: string;
  "aria-label"?: string;
}

/**
 * Container-query thresholds below which icon items collapse to icon-only. Literal classes so
 * Tailwind's @source scan picks them up; the variant targets the nearest `@container` (the root).
 */
const COLLAPSE_CLASS = {
  sm: "@max-[16rem]:hidden",
  md: "@max-[22rem]:hidden",
  lg: "@max-[28rem]:hidden",
} as const;

function isAccordion(item: ButtonGroupItem): item is ButtonGroupAccordionItem {
  return item.kind === "accordion";
}

export const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(function ButtonGroup(
  {
    items,
    variant = "segmented",
    size = "md",
    orientation = "horizontal",
    grow = false,
    collapse,
    collapseAt = "md",
    activeId,
    onSelect,
    className,
    "aria-label": ariaLabel,
  },
  ref,
) {
  const innerRef = React.useRef<HTMLDivElement>(null);
  const setRefs = React.useCallback(
    (node: HTMLDivElement | null) => {
      innerRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
    },
    [ref],
  );

  React.useEffect(() => {
    const el = innerRef.current;
    if (!el) return;

    const log = () => {
      const rect = el.getBoundingClientRect();
      // Only shout when the group is actually broken (collapsed width).
      if (rect.width >= 1) return;
      const cs = getComputedStyle(el);
      const parent = el.parentElement;
      console.warn(
        `[ButtonGroup] root width ${Math.round(rect.width)}px expected to be > 0px — here are the actual facts (I was guessing before):`,
        {
          className: el.className,
          rectWidth: rect.width,
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
          computedWidth: cs.width,
          containerType: cs.containerType,
          contain: cs.contain,
          display: cs.display,
          flex: cs.flex,
          minWidth: cs.minWidth,
          maxWidth: cs.maxWidth,
          parent: parent
            ? {
                tag: parent.tagName,
                width: parent.getBoundingClientRect().width,
                display: getComputedStyle(parent).display,
              }
            : null,
          children: Array.from(el.children).map((c) => ({
            tag: c.tagName,
            text: c.textContent?.trim().slice(0, 24),
            width: c.getBoundingClientRect().width,
            computedWidth: getComputedStyle(c).width,
            flex: getComputedStyle(c).flex,
            minWidth: getComputedStyle(c).minWidth,
          })),
        },
      );
    };

    log();
    const ro = new ResizeObserver(log);
    ro.observe(el);
    return () => ro.disconnect();
  });

  const singleSelect = variant !== "toolbar" && (activeId !== undefined || onSelect !== undefined);
  const containerRole =
    variant === "toolbar"
      ? "toolbar"
      : singleSelect && variant === "segmented"
        ? "tablist"
        : undefined;
  const effectiveCollapse = collapse ?? (variant === "toolbar" ? "never" : "container");

  const renderButton = (item: ButtonGroupButtonItem) => {
    const active = singleSelect && activeId === item.id;
    const name = item.ariaLabel ?? item.label;
    const visibleLabel = item.label || (variant === "toolbar" ? item.ariaLabel : "");

    if (
      process.env.NODE_ENV !== "production" &&
      effectiveCollapse !== "never" &&
      item.icon &&
      !visibleLabel &&
      !item.ariaLabel
    ) {
      console.warn(
        `ButtonGroup item "${item.id}" can collapse to icon-only but has no label/ariaLabel.`,
      );
    }

    const classes = cn(
      itemVariants({
        variant,
        size,
        active,
        tone: item.tone ?? "neutral",
        layout: item.layout ?? "inline",
        quiet: item.quiet ?? false,
      }),
      item.className,
    );

    const labelHidden =
      effectiveCollapse === "icon"
        ? "hidden"
        : effectiveCollapse === "container" && item.icon
          ? COLLAPSE_CLASS[collapseAt]
          : "";

    const onClick =
      item.onClick ?? (onSelect && singleSelect ? () => onSelect(item.id) : undefined);

    if (item.asChild) {
      return (
        <Slot
          key={item.id}
          className={classes}
          aria-label={name}
          title={name}
          aria-current={variant === "nav" && active ? "page" : undefined}
        >
          {item.children}
        </Slot>
      );
    }

    return (
      <button
        key={item.id}
        type={item.type ?? "button"}
        className={classes}
        onClick={onClick}
        disabled={item.disabled || item.loading}
        title={name}
        aria-label={visibleLabel ? undefined : name}
        role={singleSelect && variant === "segmented" ? "tab" : undefined}
        aria-selected={singleSelect && variant === "segmented" ? active : undefined}
        aria-current={variant === "nav" && active ? "page" : undefined}
      >
        {item.loading ? <Spinner /> : item.icon}
        {visibleLabel ? (
          <span className={cn(item.truncate ? "min-w-0 truncate" : "shrink-0", labelHidden)}>
            {visibleLabel}
          </span>
        ) : null}
        {item.badge != null ? <Badge count={item.badge} /> : null}
      </button>
    );
  };

  const renderAccordion = (item: ButtonGroupAccordionItem) => {
    if (process.env.NODE_ENV !== "production" && orientation === "horizontal") {
      console.warn(`ButtonGroup accordion item "${item.id}" is only supported in vertical groups.`);
    }
    return (
      <Accordion
        key={item.id}
        type="single"
        collapsible
        defaultValue={item.defaultExpanded ? item.id : undefined}
      >
        <AccordionItem value={item.id} className="border-0">
          <AccordionTrigger
            className={cn(
              itemVariants({ variant: "nav", size, layout: "inline" }),
              "w-full",
              item.className,
            )}
          >
            <span className="flex min-w-0 flex-1 items-center gap-2">
              {item.icon}
              <span className="min-w-0 truncate">{item.label}</span>
              {item.badge != null ? <Badge count={item.badge} /> : null}
            </span>
          </AccordionTrigger>
          <AccordionContent className="p-0">{item.content}</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  };

  return (
    <div
      ref={setRefs}
      className={cn(
        buttonGroupVariants({ variant, orientation, grow }),
        // `@container` sets `container-type: inline-size`, which makes the element's
        // width ignore its own contents. Only opt in when collapse actually uses
        // container queries — otherwise it collapses content-sized groups (e.g. `w-fit`)
        // to 0px width.
        effectiveCollapse === "container" && "@container",
        className,
      )}
      role={containerRole}
      aria-label={ariaLabel}
    >
      {items.map((item) => (isAccordion(item) ? renderAccordion(item) : renderButton(item)))}
    </div>
  );
});
