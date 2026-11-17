import type { Metadata } from "next";
import Link from "next/link";

import { TopBar } from "@/components/layout/TopBar";
import { TaskForm } from "@/components/tasks/TaskForm";
import { Card } from "@/components/ui/Card";
import { eventNamesOf } from "@/modules/events";
import { taskAssignees } from "@/modules/tasks";

import { tasksContext } from "../task-access";

export const metadata: Metadata = {
  title: "Add task · Make My Marriage",
};

/** PRD key flow F3, step 2: an Admin or Manager adds a task. */
export default async function NewTaskPage(props: PageProps<"/tasks/new">) {
  const ctx = await tasksContext("tasks.create");
  const [events, assignees, params] = await Promise.all([
    eventNamesOf(ctx),
    taskAssignees(ctx),
    props.searchParams,
  ]);
  // From an event's page: that event is chosen, if it's this wedding's.
  const fromEvent = events.find((event) => event.id === params.eventId);

  return (
    <>
      <TopBar title="Add task" />
      <main className="flex flex-1 flex-col gap-6 p-4 md:p-8">
        <Link
          href={fromEvent ? `/events/${fromEvent.id}` : "/tasks"}
          className="self-start rounded-control text-small font-medium wrap-anywhere text-accent hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-accent"
        >
          ← {fromEvent ? fromEvent.name : "Tasks"}
        </Link>
        <Card title="Task" className="max-w-3xl">
          <TaskForm
            events={events}
            assignees={assignees}
            defaultEventId={fromEvent?.id}
          />
        </Card>
      </main>
    </>
  );
}
