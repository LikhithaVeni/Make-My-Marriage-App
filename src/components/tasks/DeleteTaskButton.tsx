"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { problemMessage } from "@/components/members/problem-message";
import { deleteJson } from "@/lib/api-client";

const actionClass =
  "min-h-11 rounded-control px-3 text-small font-medium focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-70";

/** Delete a task (Admin, Manager), after a confirm step. */
export function DeleteTaskButton({
  taskId,
  title,
}: {
  taskId: string;
  title: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function remove() {
    setPending(true);
    setProblem(null);
    try {
      await deleteJson(`/api/v1/tasks/${taskId}`);
      router.push("/tasks");
      router.refresh();
    } catch (error) {
      setPending(false);
      setConfirming(false);
      setProblem(problemMessage(error));
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      {confirming ? (
        <div className="flex flex-wrap items-center gap-1 rounded-control border border-danger/30 py-1 pr-1 pl-3">
          <span className="text-small wrap-anywhere text-text">
            Delete &ldquo;{title}&rdquo;?
          </span>
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className={`${actionClass} text-danger hover:bg-accent-tint`}
          >
            {pending ? "Deleting…" : "Delete"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={pending}
            className={`${actionClass} text-text-muted hover:text-text`}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className={`${actionClass} -ml-3 text-text-muted hover:text-danger`}
        >
          Delete task
        </button>
      )}
      {problem && (
        <p role="alert" className="text-small text-danger">
          {problem}
        </p>
      )}
    </div>
  );
}
