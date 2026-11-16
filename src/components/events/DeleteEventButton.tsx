"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { problemMessage } from "@/components/members/problem-message";
import { deleteJson, getJson } from "@/lib/api-client";
import type { DeleteCheck } from "@/modules/events";

const actionClass =
  "min-h-11 rounded-control px-3 text-small font-medium focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-70";

/** What the delete will change, from the server's delete check. */
function consequences(check: DeleteCheck): string[] {
  const { tasks, paidExpenses, photos, guests } = check.willUnlink;
  const plural = (n: number, one: string, many: string) =>
    `${n} ${n === 1 ? one : many}`;
  return [
    tasks > 0 &&
      `${plural(tasks, "task becomes a general task", "tasks become general tasks")}.`,
    paidExpenses > 0 &&
      `${plural(paidExpenses, "paid expense moves", "paid expenses move")} under "No event".`,
    photos > 0 &&
      `${plural(photos, "photo moves", "photos move")} to the Unsorted album.`,
    guests > 0 &&
      `It's removed from ${plural(guests, "household's", "households'")} invitations.`,
  ].filter((line): line is string => Boolean(line));
}

/**
 * Delete an event (Admin), after showing what changes (PRD "Events": the
 * screen lists blocking items, or what will change, and asks to confirm).
 */
export function DeleteEventButton({
  eventId,
  name,
}: {
  eventId: string;
  name: string;
}) {
  const router = useRouter();
  const [check, setCheck] = useState<DeleteCheck | null>(null);
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function preview() {
    setPending(true);
    setProblem(null);
    try {
      setCheck(
        await getJson<DeleteCheck>(`/api/v1/events/${eventId}/delete-check`),
      );
    } catch (error) {
      setProblem(problemMessage(error));
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    setPending(true);
    setProblem(null);
    try {
      await deleteJson(`/api/v1/events/${eventId}`);
      router.push("/events");
      router.refresh();
    } catch (error) {
      setPending(false);
      setCheck(null);
      setProblem(problemMessage(error));
    }
  }

  if (!check) {
    return (
      <div className="flex flex-col items-start gap-1">
        <button
          type="button"
          onClick={preview}
          disabled={pending}
          className={`${actionClass} -ml-3 text-text-muted hover:text-danger`}
        >
          {pending ? "Checking…" : "Delete event"}
        </button>
        {problem && (
          <p role="alert" className="text-small text-danger">
            {problem}
          </p>
        )}
      </div>
    );
  }

  const changes = consequences(check);
  return (
    <div
      role="alertdialog"
      aria-labelledby={`delete-${eventId}`}
      className="flex flex-col gap-3 rounded-control border border-danger/30 p-4"
    >
      <p
        id={`delete-${eventId}`}
        className="font-medium wrap-anywhere text-text"
      >
        {check.blocked ? `${name} can't be deleted yet` : `Delete ${name}?`}
      </p>
      {check.blocked ? (
        <ul className="list-disc pl-5 text-small text-text-muted">
          {check.blockingTasks.map((task) => (
            <li key={task.id}>Task in progress: {task.title}</li>
          ))}
          {check.blockingExpenses.map((expense) => (
            <li key={expense.id}>Payment pending: {expense.description}</li>
          ))}
        </ul>
      ) : (
        <ul className="list-disc pl-5 text-small text-text-muted">
          {changes.map((line) => (
            <li key={line}>{line}</li>
          ))}
          <li>This can&apos;t be undone.</li>
        </ul>
      )}
      <div className="flex flex-wrap gap-1">
        {!check.blocked && (
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className={`${actionClass} text-danger hover:bg-accent-tint`}
          >
            {pending ? "Deleting…" : "Delete"}
          </button>
        )}
        <button
          type="button"
          onClick={() => setCheck(null)}
          disabled={pending}
          className={`${actionClass} text-text-muted hover:text-text`}
        >
          {check.blocked ? "Close" : "Cancel"}
        </button>
      </div>
    </div>
  );
}
