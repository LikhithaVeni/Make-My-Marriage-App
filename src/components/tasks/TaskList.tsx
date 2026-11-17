import Link from "next/link";

import { PRIORITY_LABELS, STATUS_LABELS } from "@/components/tasks/task-labels";
import { Badge } from "@/components/ui/Badge";
import { formatDayMonth, formatDue } from "@/lib/format";
import type { TaskView } from "@/modules/tasks";

/**
 * Task rows: title, status, priority, due date (Overdue in red, PRD), event
 * and assignee. Each row opens the task.
 */
export function TaskList({
  tasks,
  today,
  showEvent = true,
}: {
  tasks: TaskView[];
  /** Today in Asia/Kolkata, for "Due in 3 days". */
  today: string;
  /** Off on an event's own page, where every task is that event's. */
  showEvent?: boolean;
}) {
  return (
    <ul className="divide-y divide-border">
      {tasks.map((task) => {
        const status = STATUS_LABELS[task.status];
        const priority = PRIORITY_LABELS[task.priority];
        const done = task.status === "COMPLETED";
        return (
          <li key={task.id} className="py-2 first:pt-0 last:pb-0">
            <Link
              href={`/tasks/${task.id}`}
              className="-mx-3 flex flex-col gap-2 rounded-control px-3 py-2 hover:bg-accent-tint focus-visible:outline-2 focus-visible:outline-accent sm:flex-row sm:items-start sm:justify-between sm:gap-4"
            >
              <span className="min-w-0 wrap-anywhere">
                <span
                  className={`block font-medium ${done ? "text-text-muted line-through" : "text-text"}`}
                >
                  {task.title}
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-text-muted">
                  {task.dueDate && (
                    <span className={task.overdue ? "text-danger" : undefined}>
                      {task.overdue
                        ? `Overdue · ${formatDayMonth(task.dueDate)}`
                        : done
                          ? `Due ${formatDayMonth(task.dueDate)}`
                          : formatDue(task.dueDate, today)}
                    </span>
                  )}
                  <span>{task.assignee?.name ?? "Unassigned"}</span>
                  {showEvent && task.event && <Badge>{task.event.name}</Badge>}
                </span>
              </span>
              <span className="flex shrink-0 gap-2">
                <Badge tone={status.tone}>{status.label}</Badge>
                <Badge tone={priority.tone}>{priority.label}</Badge>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
