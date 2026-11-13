import { ApiError } from "@/lib/api-client";

/** What signup and login return (docs/API Design v1.md, "Signup" and "Login"). */
export interface AuthSession {
  user: { id: string; name: string; email: string; emailVerified: boolean };
  wedding: {
    id: string;
    title: string;
    date: string;
    slug: string;
    monogram: string;
  } | null;
  role: "ADMIN" | "MANAGER" | "PHOTOGRAPHER" | null;
}

/**
 * Where to go once signed in (PRD flow F1): unverified accounts confirm their
 * email first, then a user with no wedding creates one, then the dashboard.
 */
export function pathAfterAuth(
  session: AuthSession,
  next?: string | null,
): string {
  const safe = safeNext(next);
  // Accepting an invite confirms the email and joins a wedding, so its page
  // comes before verify and Create wedding (PRD F2).
  if (safe?.startsWith("/invite/")) return safe;
  if (!session.user.emailVerified) return "/verify";
  if (!session.wedding) return "/wedding/new";
  return safe ?? "/dashboard";
}

/**
 * A page to return to after logging in, from `/login?next=…`. Only paths on
 * this site: "//evil.example" or "https://…" would send the user elsewhere.
 */
export function safeNext(next?: string | null): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  if (next.includes("\\")) return null;
  return next;
}

export interface AlertMessage {
  title: string;
  body?: string;
}

/** The message an auth form shows for a failed request. */
export function authAlert(error: unknown): AlertMessage {
  const code = error instanceof ApiError ? error.code : null;
  switch (code) {
    case "INVALID_CREDENTIALS":
      return {
        title: "Incorrect email or password.",
        body: "Check them and try again.",
      };
    case "ACCOUNT_LOCKED":
      return {
        title: "Too many incorrect attempts.",
        body: "For your safety this account is locked for 15 minutes. Please try again later.",
      };
    case "RATE_LIMITED":
      return {
        title: "Too many attempts from this device.",
        body: "Please wait a few minutes and try again.",
      };
    case "VALIDATION_FAILED":
      return {
        title: "Some details need fixing.",
        body: "Check the fields below.",
      };
    // The auth API isn't built yet (a route that doesn't exist answers 404),
    // or the database isn't configured.
    case "NOT_FOUND":
    case "SERVICE_NOT_CONFIGURED":
      return {
        title: "Accounts aren't switched on yet.",
        body: "Signing up and logging in arrive with the next update.",
      };
    case "NETWORK_ERROR":
      return {
        title: "Couldn't reach the server.",
        body: "Check your connection and try again.",
      };
    default:
      return {
        title: "Something went wrong.",
        body: "Please try again in a moment.",
      };
  }
}
