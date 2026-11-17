import type { Metadata } from "next";
import Link from "next/link";

import { TopBar } from "@/components/layout/TopBar";
import { TaskForm } from "@/components/tasks/TaskForm";
import { Card } from "@/components/ui/Card";
import { eventNamesOf } from "@/modules/events";
import { taskAssignees } from "@/modules/tasks";

import { taskOr404, tasksContext } from "../../task-access";

export const metadata: Metadata = {
  title: "Edit task · Make My Marriage",
};

/** Edit, reassign or move a task (API Design `PATCH /tasks/{id}`). */
export default async function EditTaskPage(
  props: PageProps<"/tasks/[id]/edit">,
) {
  const ctx = await tasksContext("tasks.update");
  const task = await taskOr404(ctx, (await props.params).id);
  const [events, assignees] = await Promise.all([
    eventNamesOf(ctx),
    taskAssignees(ctx),
  ]);

  return (
    <>
      <TopBar title="Edit task" />
      <main className="flex flex-1 flex-col gap-6 p-4 md:p-8">
        <Link
          href={`/tasks/${task.id}`}
          className="self-start rounded-control text-small font-medium wrap-anywhere text-accent hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-accent"
        >
          ← {task.title}
        </Link>
        <Card title="Task" className="max-w-3xl">
          <TaskForm task={task} events={events} assignees={assignees} />
        </Card>
      </main>
    </>
  );
}
