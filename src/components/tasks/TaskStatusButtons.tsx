"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { problemMessage } from "@/components/members/problem-message";
import {
  STATUS_LABELS,
  STATUS_ORDER,
  type TaskStatus,
} from "@/components/tasks/task-labels";
import { patchJson } from "@/lib/api-client";

/**
 * Moves a task To Do → In Progress → Completed in one tap (PRD key flow F3,
 * step 4). Any step can be chosen, so a mistake is easy to undo.
 */
export function TaskStatusButtons({
  taskId,
  status,
}: {
  taskId: string;
  status: TaskStatus;
}) {
  const router = useRouter();
  // Shown as soon as the save succeeds; the page then refreshes the rest
  // (completion date, overdue). The parent keys this by status, so a
  // refreshed status replaces it.
  const [current, setCurrent] = useState(status);
  const [pending, setPending] = useState<TaskStatus | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  async function move(next: TaskStatus) {
    if (next === current) return;
    setPending(next);
    setProblem(null);
    try {
      await patchJson(`/api/v1/tasks/${taskId}`, { status: next });
      setCurrent(next);
      router.refresh();
    } catch (error) {
      setProblem(problemMessage(error));
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        role="group"
        aria-label="Status"
        className="grid grid-cols-3 gap-1 rounded-control border border-border bg-bg p-1"
      >
        {STATUS_ORDER.map((option) => {
          const selected = option === current;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              disabled={pending !== null}
              onClick={() => move(option)}
              className={`min-h-11 rounded-control border px-2 text-small font-medium focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-wait ${
                selected
                  ? "border-accent bg-surface text-accent"
                  : "border-transparent text-text-muted hover:bg-accent-tint hover:text-text"
              }`}
            >
              {pending === option ? "Saving…" : STATUS_LABELS[option].label}
            </button>
          );
        })}
      </div>
      {problem && (
        <p role="alert" className="text-small text-danger">
          {problem}
        </p>
      )}
    </div>
  );
}
