import Link from "next/link";

import { PRIORITY_LABELS } from "@/components/tasks/task-labels";
import { Badge } from "@/components/ui/Badge";
import { Card, CardLink } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDayMonth, formatDue } from "@/lib/format";
import { type Dashboard, MY_TASKS_LIMIT } from "@/modules/dashboard";

interface MyTasksCardProps {
  tasks: Dashboard["myTasks"];
  /**
   * Today in Asia/Kolkata, for "Due in 3 days" labels. Whether a task is
   * overdue comes from the server's `overdue` flag, not from this.
   */
  today: string;
  className?: string;
}

/** Tasks assigned to the viewer, overdue first (PRD, "My tasks"). */
export function MyTasksCard({ tasks, today, className }: MyTasksCardProps) {
  const overdue = tasks.filter((task) => task.overdue).length;
  // The list is capped, so a full list of overdue tasks may hide more.
  const more = overdue === MY_TASKS_LIMIT ? "+" : "";

  return (
    <Card
      title="My tasks"
      className={className}
      aside={
        overdue > 0 ? (
          <span className="text-danger">
            {overdue}
            {more} overdue
          </span>
        ) : undefined
      }
      footer={
        <CardLink label="View my tasks" href="/tasks?assigneeId=me" available />
      }
    >
      {tasks.length === 0 ? (
        <EmptyState
          title="No tasks assigned to you"
          description="Tasks assigned to you will show here, overdue first."
        />
      ) : (
        <ul className="divide-y divide-border">
          {tasks.map((task) => {
            const priority = PRIORITY_LABELS[task.priority];
            return (
              <li key={task.id} className="py-1">
                <Link
                  href={`/tasks/${task.id}`}
                  className="-mx-3 flex items-start justify-between gap-4 rounded-control px-3 py-2 hover:bg-accent-tint focus-visible:outline-2 focus-visible:outline-accent"
                >
                  <div className="min-w-0 wrap-anywhere">
                    <p className="text-text">{task.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-small">
                      {task.dueDate && (
                        <span
                          className={
                            task.overdue ? "text-danger" : "text-text-muted"
                          }
                        >
                          {task.overdue
                            ? `Overdue · ${formatDayMonth(task.dueDate)}`
                            : formatDue(task.dueDate, today)}
                        </span>
                      )}
                      {task.eventName && <Badge>{task.eventName}</Badge>}
                    </div>
                  </div>
                  <Badge tone={priority.tone}>{priority.label}</Badge>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
