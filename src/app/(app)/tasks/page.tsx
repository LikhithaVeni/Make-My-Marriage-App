import type { Metadata } from "next";
import Link from "next/link";

import { TopBar } from "@/components/layout/TopBar";
import { TaskList } from "@/components/tasks/TaskList";
import {
  PRIORITY_LABELS,
  PRIORITY_ORDER,
  STATUS_LABELS,
  STATUS_ORDER,
} from "@/components/tasks/task-labels";
import { ButtonLink, buttonClass } from "@/components/ui/ButtonLink";
import { cardSurface } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { todayInKolkata } from "@/lib/format";
import { toSearchParams } from "@/lib/search-params";
import { eventNamesOf } from "@/modules/events";
import {
  listTasks,
  listTasksQuerySchema,
  parseTaskQuery,
  taskAssignees,
} from "@/modules/tasks";

import { tasksContext } from "./task-access";

export const metadata: Metadata = {
  title: "Tasks · Make My Marriage",
};

const selectClass =
  "mt-1.5 h-11 w-full rounded-control border border-border bg-surface px-3 text-body text-text focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-accent";
const labelClass = "text-small font-medium text-text";

/** PRD views: all tasks, my tasks, overdue; then filters. */
const VIEWS = [
  { label: "All tasks", href: "/tasks", match: {} },
  {
    label: "My tasks",
    href: "/tasks?assigneeId=me",
    match: { assigneeId: "me" },
  },
  { label: "Overdue", href: "/tasks?overdue=true", match: { overdue: "true" } },
] as const;

/**
 * PRD "Tasks": all tasks, my tasks and by event, with filters by status,
 * priority, assignee and overdue. Filters are a plain form in the address,
 * so a filtered list can be bookmarked or shared.
 */
export default async function TasksPage(props: PageProps<"/tasks">) {
  const ctx = await tasksContext("tasks.list");
  const search = toSearchParams(await props.searchParams);
  const parsed = parseTaskQuery(search);
  const query = parsed.success ? parsed.data : listTasksQuerySchema.parse({});
  const [page, events, assignees] = await Promise.all([
    listTasks(ctx, query),
    eventNamesOf(ctx),
    taskAssignees(ctx),
  ]);
  const today = todayInKolkata();

  const filtered = [...search.keys()].some((key) => key !== "cursor");
  const activeView = VIEWS.find((view) => {
    const keys = [...search.keys()].filter((key) => key !== "cursor");
    const match = Object.entries(view.match);
    return (
      keys.length === match.length &&
      match.every(([key, value]) => search.get(key) === value)
    );
  });
  const more = new URLSearchParams(search);
  if (page.nextCursor) more.set("cursor", page.nextCursor);

  return (
    <>
      <TopBar title="Tasks" />
      <main className="flex flex-1 flex-col gap-6 p-4 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav aria-label="Task views" className="flex flex-wrap gap-1">
            {VIEWS.map((view) => {
              const active = view === activeView;
              return (
                <Link
                  key={view.label}
                  href={view.href}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center rounded-control px-4 text-small font-medium focus-visible:outline-2 focus-visible:outline-accent ${
                    active
                      ? "bg-accent-tint text-accent"
                      : "text-text hover:bg-accent-tint"
                  }`}
                >
                  {view.label}
                </Link>
              );
            })}
          </nav>
          <ButtonLink href="/tasks/new">Add task</ButtonLink>
        </div>

        <details
          className={`group p-4 ${cardSurface}`}
          open={filtered && !activeView}
        >
          <summary className="min-h-11 cursor-pointer content-center rounded-control font-medium text-accent focus-visible:outline-2 focus-visible:outline-accent">
            Filter and sort
          </summary>
          <form
            action="/tasks"
            className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <div>
              <label htmlFor="filter-q" className={labelClass}>
                Search titles
              </label>
              <input
                id="filter-q"
                name="q"
                type="search"
                defaultValue={query.q ?? ""}
                className={selectClass}
              />
            </div>
            <div>
              <label htmlFor="filter-status" className={labelClass}>
                Status
              </label>
              <select
                id="filter-status"
                name="status"
                defaultValue={query.status?.length === 1 ? query.status[0] : ""}
                className={selectClass}
              >
                <option value="">Any status</option>
                {STATUS_ORDER.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="filter-priority" className={labelClass}>
                Priority
              </label>
              <select
                id="filter-priority"
                name="priority"
                defaultValue={query.priority ?? ""}
                className={selectClass}
              >
                <option value="">Any priority</option>
                {PRIORITY_ORDER.map((priority) => (
                  <option key={priority} value={priority}>
                    {PRIORITY_LABELS[priority].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="filter-assignee" className={labelClass}>
                Assigned to
              </label>
              <select
                id="filter-assignee"
                name="assigneeId"
                defaultValue={query.assigneeId ?? ""}
                className={selectClass}
              >
                <option value="">Anyone</option>
                <option value="me">Me</option>
                <option value="none">Unassigned</option>
                {assignees.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="filter-event" className={labelClass}>
                Event
              </label>
              <select
                id="filter-event"
                name="eventId"
                defaultValue={query.eventId ?? ""}
                className={selectClass}
              >
                <option value="">Any event</option>
                <option value="none">General wedding tasks</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="filter-sort" className={labelClass}>
                Sort by
              </label>
              <select
                id="filter-sort"
                name="sort"
                defaultValue={query.sort}
                className={selectClass}
              >
                <option value="dueDate">Due date</option>
                <option value="-priority">Priority, highest first</option>
                <option value="-createdAt">Newest first</option>
              </select>
            </div>
            <label className="flex min-h-11 items-center gap-3 text-small text-text">
              <input
                type="checkbox"
                name="overdue"
                value="true"
                defaultChecked={query.overdue === "true"}
                className="size-5 accent-accent"
              />
              Only overdue
            </label>
            <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-3">
              <button type="submit" className={buttonClass()}>
                Apply
              </button>
              <Link href="/tasks" className={buttonClass("secondary")}>
                Clear
              </Link>
            </div>
          </form>
        </details>

        {!parsed.success && (
          <p role="status" className="text-small text-warning">
            Some filters in the address weren&apos;t recognised, so all tasks
            are shown.
          </p>
        )}

        <section className={`p-6 ${cardSurface}`} aria-label="Task list">
          {page.tasks.length === 0 ? (
            filtered ? (
              <EmptyState
                title="No tasks match"
                description="Try another view or clear the filters."
              />
            ) : (
              <EmptyState
                title="No tasks yet"
                description="Add what needs doing for each event, or for the wedding in general, and assign it to someone."
              >
                <ButtonLink href="/tasks/new">Add task</ButtonLink>
              </EmptyState>
            )
          ) : (
            <TaskList tasks={page.tasks} today={today} />
          )}
        </section>

        {page.nextCursor && (
          <Link
            href={`/tasks?${more.toString()}`}
            className={`self-start ${buttonClass("secondary")}`}
          >
            Next page
          </Link>
        )}
      </main>
    </>
  );
}
