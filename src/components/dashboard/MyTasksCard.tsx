import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Card, CardLink } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDayMonth, formatDue } from "@/lib/format";
import type { Dashboard, TaskPriority } from "@/modules/dashboard";

const priorities: Record<TaskPriority, { label: string; tone: BadgeTone }> = {
  HIGH: { label: "High", tone: "accent" },
  MEDIUM: { label: "Medium", tone: "warning" },
  LOW: { label: "Low", tone: "neutral" },
};

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

  return (
    <Card
      title="My tasks"
      className={className}
      aside={
        overdue > 0 ? (
          <span className="text-danger">{overdue} overdue</span>
        ) : undefined
      }
      footer={
        <CardLink label="View all tasks" href="/tasks" available={false} />
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
            const priority = priorities[task.priority];
            return (
              <li
                key={task.id}
                className="flex items-start justify-between gap-4 py-3"
              >
                <div className="min-w-0">
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
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
