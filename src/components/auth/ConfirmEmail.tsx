"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ApiError, postJson } from "@/lib/api-client";

import { authAlert } from "./auth-client";
import { FormAlert } from "./FormAlert";

const linkProblems: Record<string, { title: string; body: string }> = {
  TOKEN_EXPIRED: {
    title: "This link has expired.",
    body: "Links work for 24 hours. Log in and send yourself a new one.",
  },
  TOKEN_USED: {
    title: "This link has already been used.",
    body: "If you confirmed your email already, just log in.",
  },
  NOT_FOUND: {
    title: "This link isn't valid.",
    body: "Open the newest email we sent, or log in and send a new one.",
  },
};

/**
 * Confirms the email from a verification link as soon as the page opens, then
 * shows /verify without the link, which knows where to go next.
 */
export function ConfirmEmail({ token }: { token: string }) {
  const router = useRouter();
  const [problem, setProblem] = useState<{
    title: string;
    body?: string;
  } | null>(null);
  // React runs effects twice in development; a link must be used only once.
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    postJson("/api/v1/auth/verify", { token })
      .then(() => {
        router.replace("/verify");
        router.refresh();
      })
      .catch((error: unknown) => {
        const code = error instanceof ApiError ? error.code : "";
        setProblem(linkProblems[code] ?? authAlert(error));
      });
  }, [token, router]);

  if (problem) {
    return <FormAlert title={problem.title}>{problem.body}</FormAlert>;
  }
  return (
    <p role="status" className="text-text-muted">
      Confirming your email…
    </p>
  );
}
