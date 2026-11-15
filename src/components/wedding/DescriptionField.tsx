"use client";

import { useId } from "react";

/** PRD "Wedding setup": the tagline used when none is given. */
export const DEFAULT_TAGLINE = "invite you to celebrate with us";

const textareaClass =
  "w-full rounded-control border bg-surface px-3.5 py-2.5 text-body text-text placeholder:text-text-muted focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-accent";

/** "About the wedding": the optional description, up to 2,000 characters. */
export function DescriptionField({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="text-small font-medium text-text">
        About the wedding (optional)
      </label>
      <textarea
        id={id}
        name="description"
        rows={3}
        maxLength={2000}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`mt-1.5 ${textareaClass} ${error ? "border-danger" : "border-border"}`}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-small text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
