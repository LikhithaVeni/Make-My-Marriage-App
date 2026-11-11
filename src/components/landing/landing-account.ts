import "server-only";

import { unstable_rethrow } from "next/navigation";

import { pathAfterAuth } from "@/components/auth/auth-client";
import { readSession } from "@/lib/session";
import { AppError } from "@/platform/errors";

/** Who is looking at a public page, and where their button should go. */
export interface LandingAccount {
  name: string;
  href: string;
  label: string;
  /** For the header on phones, where the full label doesn't fit. */
  shortLabel: string;
}

/**
 * The signed-in visitor, or null. Public pages must still load when the
 * database can't be reached, so a failed lookup counts as logged out; it is
 * logged, unless the database simply isn't configured, so a real fault
 * doesn't go unnoticed.
 */
export async function landingAccount(): Promise<LandingAccount | null> {
  const session = await readSession().catch((err: unknown) => {
    // Next.js signals "this page reads cookies, render it per request" by
    // throwing; that signal must pass through.
    unstable_rethrow(err);
    if (!(err instanceof AppError && err.code === "SERVICE_NOT_CONFIGURED")) {
      console.error(
        "[landing] Couldn't read the session; showing logged out.",
        err,
      );
    }
    return null;
  });
  if (!session) return null;
  const { result } = session;
  return {
    name: result.user.name,
    href: pathAfterAuth(result),
    label: result.wedding ? "Go to dashboard" : "Continue setup",
    shortLabel: result.wedding ? "Dashboard" : "Continue",
  };
}
