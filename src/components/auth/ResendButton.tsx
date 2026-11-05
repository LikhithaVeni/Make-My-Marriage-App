"use client";

import { useState } from "react";

import { buttonClass } from "@/components/ui/ButtonLink";
import { ApiError, postJson } from "@/lib/api-client";

import { authAlert } from "./auth-client";

type State = "idle" | "sending" | "sent" | { error: string };

/** Sends a new verification email (at most 3 an hour). */
export function ResendButton() {
  const [state, setState] = useState<State>("idle");

  async function resend() {
    setState("sending");
    try {
      await postJson("/api/v1/auth/verify/resend", {});
      setState("sent");
    } catch (error) {
      setState({
        error:
          error instanceof ApiError && error.code === "RATE_LIMITED"
            ? "You've asked for 3 emails this hour. Please wait a while and check your inbox."
            : authAlert(error).title,
      });
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={resend}
        disabled={state === "sending"}
        className={`${buttonClass("secondary")} w-full`}
      >
        {state === "sending" ? "Sending…" : "Resend email"}
      </button>
      <p role="status" className="mt-2 min-h-5 text-small">
        {state === "sent" && (
          <span className="text-success">
            Sent. Check your inbox for the newest email.
          </span>
        )}
        {typeof state === "object" && (
          <span className="text-danger">{state.error}</span>
        )}
      </p>
    </div>
  );
}
