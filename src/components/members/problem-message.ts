import { authAlert } from "@/components/auth/auth-client";
import { ApiError } from "@/lib/api-client";

/**
 * One line to show when a members action fails. The server's messages are
 * written to be shown (API Design: "a human message safe to show in the
 * UI"); network and unexpected failures get the usual wording.
 */
export function problemMessage(error: unknown): string {
  if (
    error instanceof ApiError &&
    error.status > 0 &&
    error.status < 500 &&
    error.code !== "NOT_FOUND"
  ) {
    return error.message;
  }
  if (error instanceof ApiError && error.code === "NOT_FOUND") {
    return "That's changed since the page loaded. Refresh and try again.";
  }
  return authAlert(error).title;
}
