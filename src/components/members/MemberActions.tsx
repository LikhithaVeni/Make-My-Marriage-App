"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { deleteJson, patchJson } from "@/lib/api-client";

import { problemMessage } from "./problem-message";

const actionClass =
  "min-h-11 rounded-control px-3 text-small font-medium focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-70";

interface MemberActionsProps {
  userId: string;
  name: string;
  role: "ADMIN" | "MANAGER" | "PHOTOGRAPHER";
  isYou: boolean;
}

/**
 * Make Admin / Make Manager and Remove, with a confirm step for removing.
 * The server keeps the last Admin (PRD "Rules"); its message shows here.
 */
export function MemberActions({
  userId,
  name,
  role,
  isYou,
}: MemberActionsProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  if (role === "PHOTOGRAPHER") return null;
  const path = `/api/v1/members/${userId}`;

  async function run(action: () => Promise<unknown>, after?: () => void) {
    setPending(true);
    setProblem(null);
    try {
      await action();
      after?.();
      router.refresh();
    } catch (error) {
      setProblem(problemMessage(error));
    } finally {
      setPending(false);
      setConfirming(false);
    }
  }

  const changeRole = () =>
    run(
      () => patchJson(path, { role: role === "ADMIN" ? "MANAGER" : "ADMIN" }),
      // Changing your own role ends your sessions (API Design), so log in again.
      isYou ? () => router.push("/login") : undefined,
    );
  const remove = () =>
    run(
      () => deleteJson(path),
      isYou ? () => router.push("/login") : undefined,
    );

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      {confirming ? (
        <div className="flex flex-wrap items-center gap-1 rounded-control border border-border bg-surface py-1 pr-1 pl-3">
          <span className="text-small text-text">
            {isYou ? "Leave this wedding?" : `Remove ${name}?`}
          </span>
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className={`${actionClass} text-danger hover:bg-accent-tint`}
          >
            {pending ? "Removing…" : isYou ? "Leave" : "Remove"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className={`${actionClass} text-text-muted hover:text-text`}
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={changeRole}
            disabled={pending}
            className={`${actionClass} text-accent hover:bg-accent-tint`}
          >
            {role === "ADMIN" ? "Make Manager" : "Make Admin"}
          </button>
          <span aria-hidden="true" className="h-4 w-px bg-border" />
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={pending}
            className={`${actionClass} text-text-muted hover:text-danger`}
          >
            {isYou ? "Leave" : "Remove"}
          </button>
        </div>
      )}
      {problem && (
        <p
          role="alert"
          className="max-w-xs text-small text-danger sm:text-right"
        >
          {problem}
        </p>
      )}
    </div>
  );
}
