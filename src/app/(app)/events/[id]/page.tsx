import type { Metadata } from "next";
import Link from "next/link";

import { DeleteEventButton } from "@/components/events/DeleteEventButton";
import { TopBar } from "@/components/layout/TopBar";
import { ExpenseList } from "@/components/expenses/ExpenseList";
import { TaskList } from "@/components/tasks/TaskList";
import { FindNearby } from "@/components/vendors/FindNearby";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  formatDayHeading,
  formatTimeFrom,
  formatTimeRange,
  formatRupees,
  kolkataDateOf,
  todayInKolkata,
} from "@/lib/format";
import { listExpenses, listExpensesQuerySchema } from "@/modules/expenses";
import { listTasks, listTasksQuerySchema } from "@/modules/tasks";

import { can, eventOr404, eventsContext } from "../event-access";

export const metadata: Metadata = {
  title: "Event · Make My Marriage",
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
      <dt className="shrink-0 text-small text-text-muted sm:w-40">{label}</dt>
      <dd className="min-w-0 wrap-anywhere text-text">{children}</dd>
    </div>
  );
}

/**
 * PRD "Event detail": the event's details. Tasks, expenses, guests and photos
 * for the event join this page as those features arrive (decision 70).
 */
export default async function EventPage(props: PageProps<"/events/[id]">) {
  const ctx = await eventsContext("events.view");
  const event = await eventOr404(ctx, (await props.params).id);
  const startDay = kolkataDateOf(event.startAt);
  // PRD "Event detail": the event's tasks (expenses, guests and photos
  // join as those features arrive).
  const [{ tasks }, { expenses }] = await Promise.all([
    listTasks(
      ctx,
      listTasksQuerySchema.parse({ eventId: event.id, limit: 100 }),
    ),
    listExpenses(
      ctx,
      listExpensesQuerySchema.parse({ eventId: event.id, limit: 100 }),
    ),
  ]);
  const spentPaise = expenses
    .filter((expense) => expense.status === "PAID")
    .reduce((sum, expense) => sum + expense.amountPaise, 0);
  const pendingPaise = expenses
    .filter((expense) => expense.status === "PENDING")
    .reduce((sum, expense) => sum + expense.amountPaise, 0);
  const completed = tasks.filter((task) => task.status === "COMPLETED").length;

  return (
    <>
      <TopBar title={event.name} />
      <main className="flex flex-1 flex-col gap-6 p-4 md:p-8">
        <Link href="/events" className={`self-start text-small ${linkClass}`}>
          ← Events
        </Link>

        <Card
          title="Details"
          className="max-w-3xl"
          aside={
            can(ctx.role, "events.update") ? (
              <ButtonLink href={`/events/${event.id}/edit`} variant="secondary">
                Edit details
              </ButtonLink>
            ) : undefined
          }
        >
          <dl className="divide-y divide-border">
            <Row label="When">
              <p>{formatDayHeading(startDay)}</p>
              <p className="text-small text-text-muted">
                {formatTimeRange(event.startAt, event.endAt)} · India time (IST)
              </p>
            </Row>
            {event.muhurthamAt && (
              <Row label="Muhurtham">
                {formatTimeFrom(event.startAt, event.muhurthamAt)}
              </Row>
            )}
            <Row label="Venue">
              <p className="font-medium">{event.venue.name}</p>
              <p className="text-small whitespace-pre-line text-text-muted">
                {event.venue.address}
              </p>
              <a
                href={event.venue.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-1 inline-block text-small ${linkClass}`}
              >
                Open in Google Maps
                <span aria-hidden="true"> ↗</span>
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </Row>
            {event.dressCode && <Row label="Dress code">{event.dressCode}</Row>}
            {event.instructions && (
              <Row label="Instructions">
                <p className="whitespace-pre-line">{event.instructions}</p>
                <p className="mt-1 text-caption text-text-muted">
                  Shown to guests on their invitation.
                </p>
              </Row>
            )}
            {event.livestreamUrl && (
              <Row label="Livestream">
                <a
                  href={event.livestreamUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-small break-all ${linkClass}`}
                >
                  {event.livestreamUrl}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </Row>
            )}
          </dl>
        </Card>

        <Card
          title="Tasks"
          className="max-w-3xl"
          aside={
            tasks.length > 0
              ? `${completed} of ${tasks.length} completed`
              : undefined
          }
          footer={
            <div className="flex flex-wrap items-center justify-between gap-3 py-2">
              <ButtonLink href={`/tasks/new?eventId=${event.id}`}>
                Add task
              </ButtonLink>
              {tasks.length > 0 && (
                <Link
                  href={`/tasks?eventId=${event.id}`}
                  className={`text-small ${linkClass}`}
                >
                  Filter in Tasks →
                </Link>
              )}
            </div>
          }
        >
          {tasks.length === 0 ? (
            <EmptyState
              title={`No tasks for ${event.name} yet`}
              description="Add what needs doing, such as booking the decorator, and assign it to someone."
            />
          ) : (
            <TaskList
              tasks={tasks}
              today={todayInKolkata()}
              showEvent={false}
            />
          )}
        </Card>

        <Card
          title="Expenses"
          className="max-w-3xl"
          aside={
            expenses.length > 0 ? (
              <span>
                {formatRupees(spentPaise)} spent
                {pendingPaise > 0 && (
                  <span className="text-warning">
                    {" "}
                    · {formatRupees(pendingPaise)} pending
                  </span>
                )}
              </span>
            ) : undefined
          }
          footer={
            <div className="flex flex-wrap items-center justify-between gap-3 py-2">
              <ButtonLink
                href={`/expenses/new?eventId=${event.id}`}
                variant="secondary"
              >
                Add expense
              </ButtonLink>
              {expenses.length > 0 && (
                <Link
                  href={`/expenses?eventId=${event.id}`}
                  className={`text-small ${linkClass}`}
                >
                  Filter in Expenses →
                </Link>
              )}
            </div>
          }
        >
          {expenses.length === 0 ? (
            <EmptyState
              title={`No expenses for ${event.name} yet`}
              description="Record advances, balances still due and anything else spent."
            />
          ) : (
            <ExpenseList
              expenses={expenses}
              today={todayInKolkata()}
              showEvent={false}
            />
          )}
        </Card>

        <Card title="Find nearby" className="max-w-3xl">
          <p className="mb-4 text-small wrap-anywhere text-text-muted">
            Search Google Maps for a caterer, decorator or any other service
            near {event.venue.name}, then save the one you choose under Vendors.
          </p>
          <FindNearby
            events={[
              {
                id: event.id,
                name: event.name,
                venue: { name: event.venue.name, address: event.venue.address },
              },
            ]}
          />
        </Card>

        {can(ctx.role, "events.delete") && (
          <div className="max-w-3xl">
            <DeleteEventButton eventId={event.id} name={event.name} />
          </div>
        )}
      </main>
    </>
  );
}
