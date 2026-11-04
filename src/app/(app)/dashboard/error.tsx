"use client"; // Error boundaries must be Client Components.

import { useEffect } from "react";

import { TopBar } from "@/components/layout/TopBar";
import { cardSurface } from "@/components/ui/Card";

// Next.js 16 passes `retry` (not the older `reset`), and `error` may be any
// thrown value (node_modules/next/dist/docs, "error.js").
export default function DashboardError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  // In production, server errors arrive with only a digest that matches the
  // server logs; quoting it lets us find the cause when someone reports it.
  const digest =
    error instanceof Error &&
    "digest" in error &&
    typeof error.digest === "string"
      ? error.digest
      : null;

  return (
    <>
      <TopBar title="Dashboard" />
      <main className="flex flex-1 flex-col p-4 md:p-8">
        <section
          role="alert"
          className={`mx-auto mt-8 flex w-full max-w-md flex-col items-center p-8 text-center ${cardSurface}`}
        >
          <h2 className="font-display text-heading text-text">
            Couldn&apos;t load the dashboard
          </h2>
          <p className="mt-2 text-text-muted">
            Something went wrong on our side. Please try again in a moment.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-control bg-accent px-6 font-medium text-surface hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Try again
          </button>
          {digest && (
            <p className="mt-4 text-caption text-text-muted">
              Reference: {digest}
            </p>
          )}
        </section>
      </main>
    </>
  );
}
