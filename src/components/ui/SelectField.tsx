"use client";

import { useId } from "react";

interface SelectFieldProps extends Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "id" | "onChange"
> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  /** Shown under the field in red; also marks the field invalid. */
  error?: string | null;
  hint?: string;
}

const selectClass =
  "mt-1.5 h-11 w-full rounded-control border bg-surface px-3 text-body text-text focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-accent";

/** A labelled native select, styled like TextField (docs/design-system.md). */
export function SelectField({
  label,
  value,
  onChange,
  options,
  error,
  hint,
  ...props
}: SelectFieldProps) {
  const id = useId();
  const note = error ?? hint;
  const noteId = note ? `${id}-note` : undefined;
  return (
    <div>
      <label htmlFor={id} className="text-small font-medium text-text">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={noteId}
        className={`${selectClass} ${error ? "border-danger" : "border-border"}`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {note && (
        <p
          id={noteId}
          className={`mt-1.5 text-small ${error ? "text-danger" : "text-text-muted"}`}
        >
          {note}
        </p>
      )}
    </div>
  );
}
