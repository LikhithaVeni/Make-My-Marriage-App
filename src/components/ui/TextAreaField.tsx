"use client";

import { useId } from "react";

interface TextAreaFieldProps extends Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "id" | "onChange"
> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Shown under the field in red; also marks the field invalid. */
  error?: string | null;
  /** Shown under the field when there is no error. */
  hint?: string;
}

const textareaClass =
  "mt-1.5 w-full rounded-control border bg-surface px-3.5 py-2.5 text-body text-text placeholder:text-text-muted focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-accent";

/** A labelled multi-line field, styled like TextField (docs/design-system.md). */
export function TextAreaField({
  label,
  value,
  onChange,
  error,
  hint,
  rows = 3,
  ...props
}: TextAreaFieldProps) {
  const id = useId();
  const note = error ?? hint;
  const noteId = note ? `${id}-note` : undefined;
  return (
    <div>
      <label htmlFor={id} className="text-small font-medium text-text">
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={noteId}
        className={`${textareaClass} ${error ? "border-danger" : "border-border"}`}
        {...props}
      />
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
