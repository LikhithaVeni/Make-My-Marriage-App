"use client";

import { useCallback, useEffect, useState } from "react";

import { TextField } from "@/components/ui/TextField";

// The website address field shared by Create wedding and Wedding details:
// checked while typing, with free alternatives when taken (PRD F1).

/** The server's answer for one address. */
interface SlugCheck {
  slug: string;
  available: boolean;
  suggestions: string[];
}

export type SlugStatus = "idle" | "checking" | "available" | "taken" | "own";

const SLUG_SHAPE = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

/** Addresses are lowercase letters, numbers and hyphens only. */
export function cleanSlug(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
}

/**
 * Checks `slug` shortly after typing stops. `ownSlug` is the wedding's
 * current address, which needs no check. `markTaken` records the server's
 * answer when saving finds the address taken.
 */
export function useSlugCheck(slug: string, ownSlug?: string) {
  const [check, setCheck] = useState<SlugCheck | null>(null);
  const isOwn = ownSlug !== undefined && slug === ownSlug;

  const status: SlugStatus = isOwn
    ? "own"
    : !SLUG_SHAPE.test(slug)
      ? "idle"
      : check?.slug !== slug
        ? "checking"
        : check.available
          ? "available"
          : "taken";

  useEffect(() => {
    if (isOwn || !SLUG_SHAPE.test(slug)) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/v1/wedding/slug-available?slug=${encodeURIComponent(slug)}`,
          { signal: controller.signal },
        );
        const payload = (await response.json()) as { data?: SlugCheck };
        if (payload.data) setCheck(payload.data);
      } catch {
        // Aborted or offline: saving checks the address again anyway.
      }
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [slug, isOwn]);

  const markTaken = useCallback(
    (taken: string, suggestions: string[]) =>
      setCheck({ slug: taken, available: false, suggestions }),
    [],
  );

  return {
    status,
    suggestions: status === "taken" ? check!.suggestions : [],
    markTaken,
  };
}

interface SlugFieldProps {
  value: string;
  onChange: (slug: string) => void;
  status: SlugStatus;
  suggestions: string[];
  error?: string;
  /** The app's address without the scheme, e.g. "localhost:3000". */
  siteHost: string;
  hint?: string;
}

export function SlugField({
  value,
  onChange,
  status,
  suggestions,
  error,
  siteHost,
  hint,
}: SlugFieldProps) {
  return (
    <div>
      <TextField
        label="Website address"
        name="slug"
        hint={
          hint ??
          `Your wedding website will be at ${siteHost}/w/${value || "your-address"}`
        }
        autoComplete="off"
        spellCheck={false}
        value={value}
        error={error}
        onChange={(event) => onChange(cleanSlug(event.target.value))}
      />
      <p role="status" className="mt-1.5 min-h-5 text-small">
        {status === "checking" && (
          <span className="text-text-muted">Checking…</span>
        )}
        {status === "available" && !error && (
          <span className="text-success">This address is free.</span>
        )}
        {status === "taken" && !error && (
          <span className="text-danger">This address is taken.</span>
        )}
      </p>
      {suggestions.length > 0 && (
        <div className="mt-1 flex flex-wrap items-center gap-2 text-small">
          <span className="text-text-muted">Try:</span>
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onChange(suggestion)}
              className="min-h-9 rounded-full border border-border bg-bg px-3 text-text hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
