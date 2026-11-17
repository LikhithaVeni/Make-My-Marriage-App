import type { Metadata } from "next";
import Link from "next/link";

import { TopBar } from "@/components/layout/TopBar";
import { DeleteTaskButton } from "@/components/tasks/DeleteTaskButton";
import { TaskStatusButtons } from "@/components/tasks/TaskStatusButtons";
import { PRIORITY_LABELS } from "@/components/tasks/task-labels";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import {
  formatDate,
  formatDue,
  kolkataDateOf,
  todayInKolkata,
} from "@/lib/format";

import { taskOr404, tasksContext } from "../task-access";

export const metadata: Metadata = {
  title: "Task · Make My Marriage",
};

const linkClass =
  "rounded-control font-medium text-accent hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-accent";

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 py-4 first:pt-0 last:pb-0 sm:flex-row sm:gap-6">
      <dt className="shrink-0 text-small text-text-muted sm:w-36">{label}</dt>
      <dd className="min-w-0 wrap-anywhere text-text">{children}</dd>
    </div>
  );
}

/** PRD "Task detail": the task, its status in one tap, edit and delete. */
export default async function TaskPage(props: PageProps<"/tasks/[id]">) {
  const ctx = await tasksContext("tasks.view");
  const task = await taskOr404(ctx, (await props.params).id);
  const priority = PRIORITY_LABELS[task.priority];

  return (
    <>
      <TopBar title="Task" />
      <main className="flex flex-1 flex-col gap-6 p-4 md:p-8">
        <Link href="/tasks" className={`self-start text-small ${linkClass}`}>
          ← Tasks
        </Link>

        <Card
          title={task.title}
          className="max-w-3xl wrap-anywhere"
          aside={
            <ButtonLink href={`/tasks/${task.id}/edit`} variant="secondary">
              Edit
            </ButtonLink>
          }
        >
          <div className="mb-6">
            <TaskStatusButtons
              key={task.status}
              taskId={task.id}
              status={task.status}
            />
            {task.completedAt && (
              <p className="mt-2 text-small text-success">
                Completed on {formatDate(kolkataDateOf(task.completedAt))}
              </p>
            )}
          </div>
          <dl className="divide-y divide-border">
            <Row label="Due">
              {task.dueDate ? (
                <span className={task.overdue ? "text-danger" : undefined}>
                  {formatDate(task.dueDate, "long")}
                  {task.overdue
                    ? " · Overdue"
                    : task.status !== "COMPLETED" &&
                      ` · ${formatDue(task.dueDate, todayInKolkata())}`}
                </span>
              ) : (
                <span className="text-text-muted">No due date</span>
              )}
            </Row>
            <Row label="Assigned to">
              {task.assignee ? (
                <>
                  {task.assignee.name}
                  {task.assignee.relationLabel && (
                    <span className="text-text-muted">
                      {" "}
                      · {task.assignee.relationLabel}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-text-muted">Unassigned</span>
              )}
            </Row>
            <Row label="Event">
              {task.event ? (
                <Link href={`/events/${task.event.id}`} className={linkClass}>
                  {task.event.name}
                </Link>
              ) : (
                <span className="text-text-muted">General wedding task</span>
              )}
            </Row>
            <Row label="Priority">
              <Badge tone={priority.tone}>{priority.label}</Badge>
            </Row>
            {task.description && (
              <Row label="Notes">
                <p className="whitespace-pre-line">{task.description}</p>
              </Row>
            )}
          </dl>
        </Card>

        <div className="max-w-3xl">
          <DeleteTaskButton taskId={task.id} title={task.title} />
        </div>
      </main>
    </>
  );
}
