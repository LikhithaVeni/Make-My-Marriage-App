"use client";

import { useId, useState } from "react";

interface TextFieldProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "id" | "type"
> {
  label: string;
  type?: "text" | "email" | "password";
  /** Shown under the field in red; also marks the field invalid. */
  error?: string | null;
  /** Shown under the field when there is no error, e.g. "At least 10 characters". */
  hint?: string;
  /** Right of the label, e.g. a "Forgot password?" link. */
  labelAside?: React.ReactNode;
}

const inputClass =
  "h-11 w-full rounded-control border bg-surface px-3.5 text-body text-text placeholder:text-text-muted focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-accent";

/**
 * A labelled input (docs/design-system.md, "Text field"): 44px tall, the error
 * or hint linked for screen readers. Passwords get a show/hide button.
 */
export function TextField({
  label,
  type = "text",
  error,
  hint,
  labelAside,
  className,
  ...inputProps
}: TextFieldProps) {
  const id = useId();
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";
  const note = error ?? hint;
  const noteId = note ? `${id}-note` : undefined;

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-small font-medium text-text">
          {label}
        </label>
        {labelAside}
      </div>
      <div className="relative mt-1.5">
        <input
          id={id}
          type={isPassword && revealed ? "text" : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={noteId}
          className={`${inputClass} ${error ? "border-danger" : "border-border"} ${isPassword ? "pr-12" : ""}`}
          {...inputProps}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((shown) => !shown)}
            aria-label={revealed ? "Hide password" : "Show password"}
            aria-pressed={revealed}
            className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center rounded-control text-text-muted hover:text-text focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-5"
            >
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
              <circle cx="12" cy="12" r="3" />
              {revealed && <path d="m4 4 16 16" />}
            </svg>
          </button>
        )}
      </div>
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
