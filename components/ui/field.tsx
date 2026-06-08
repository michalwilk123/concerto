"use client";

import { cloneElement, isValidElement, type ReactElement, type ReactNode, useId } from "react";
import { Typography } from "@/components/ui/typography";

/**
 * Field — the standard form-field wrapper: label + control + error/hint, with consistent
 * spacing and accessibility. Composition, not configuration: pass any control as the single
 * child (TextInput, Select trigger, textarea, etc.).
 *
 *   <Field label={t("manage.nameLabel")} required error={errors.name}>
 *     <TextInput value={name} onChange={...} />
 *   </Field>
 *
 * The label is associated to the control via a shared id (auto-generated unless `htmlFor` is
 * passed), and when `error` is set the control receives `aria-invalid` + `aria-describedby`.
 */

interface ControlProps {
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

interface FieldProps {
  label?: ReactNode;
  /** Explicit control id. Omit to auto-generate one and wire it to the label + child. */
  htmlFor?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  style?: React.CSSProperties;
  children: ReactNode;
}

export function Field({ label, htmlFor, required, error, hint, className, style, children }: FieldProps) {
  const autoId = useId();
  const control = isValidElement<ControlProps>(children) ? (children as ReactElement<ControlProps>) : null;
  const id = htmlFor ?? control?.props.id ?? autoId;
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;
  const describedBy = [control?.props["aria-describedby"], errorId, hintId].filter(Boolean).join(" ") || undefined;

  const renderedControl = control
    ? cloneElement(control, {
        id,
        "aria-invalid": error ? true : control.props["aria-invalid"],
        "aria-describedby": describedBy,
      })
    : children;

  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
      {label != null ? (
        <Typography as="label" variant="label" tone="secondary" htmlFor={id} style={{ display: "block" }}>
          {label}
          {required ? <span style={{ color: "var(--accent-red)", marginLeft: 2 }}>*</span> : null}
        </Typography>
      ) : null}
      {renderedControl}
      {error ? (
        <Typography as="span" id={errorId} variant="caption" tone="danger">
          {error}
        </Typography>
      ) : hint ? (
        <Typography as="span" id={hintId} variant="caption" tone="tertiary">
          {hint}
        </Typography>
      ) : null}
    </div>
  );
}
