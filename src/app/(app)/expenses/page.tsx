import type { Metadata } from "next";
import Link from "next/link";

import { ExpenseList } from "@/components/expenses/ExpenseList";
import { TopBar } from "@/components/layout/TopBar";
import { ButtonLink, buttonClass } from "@/components/ui/ButtonLink";
import { Card, cardSurface } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Stat } from "@/components/ui/Stat";
import { CATEGORY_LABELS } from "@/lib/expense-labels";
import {
  formatDue,
  formatRupees,
  formatRupeesShort,
  todayInKolkata,
} from "@/lib/format";
import { toSearchParams } from "@/lib/search-params";
import { eventNamesOf } from "@/modules/events";
import {
  expenseSummary,
  listExpenses,
  listExpensesQuerySchema,
  parseExpenseQuery,
} from "@/modules/expenses";

import { expensesContext } from "./expense-access";

export const metadata: Metadata = {
  title: "Expenses · Make My Marriage",
};

const fieldClass =
  "mt-1.5 h-11 w-full rounded-control border border-border bg-surface px-3 text-body text-text focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-accent";
const labelClass = "text-small font-medium text-text";

/** One "spent per …" row: what's paid, and what's still pending. */
function TotalRow({
  name,
  paidPaise,
  totalPaise,
  href,
}: {
  name: string;
  paidPaise: number;
  totalPaise: number;
  href: string;
}) {
  const pending = totalPaise - paidPaise;
  return (
    <li className="py-1 first:pt-0 last:pb-0">
      <Link
        href={href}
        className="-mx-3 flex items-baseline justify-between gap-4 rounded-control px-3 py-2 hover:bg-accent-tint focus-visible:outline-2 focus-visible:outline-accent"
      >
        <span className="min-w-0 wrap-anywhere text-text">{name}</span>
        <span className="shrink-0 text-right">
          <span className="block font-medium text-text">
            {formatRupees(paidPaise)}
          </span>
          {pending > 0 && (
            <span className="block text-small text-warning">
              + {formatRupees(pending)} pending
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}

/**
 * PRD "Expenses": what was actually spent, with no budget, for all
 * organisers. Totals overall, per event, per category and pending, then
 * the list with filters (API Design `GET /expenses`).
 */
export default async function ExpensesPage(props: PageProps<"/expenses">) {
  const { ctx } = await expensesContext("expenses.list");
  const search = toSearchParams(await props.searchParams);
  const parsed = parseExpenseQuery(search);
  const query = parsed.success
    ? parsed.data
    : listExpensesQuerySchema.parse({});
  const [summary, page, events] = await Promise.all([
    expenseSummary(ctx),
    listExpenses(ctx, query),
    eventNamesOf(ctx),
  ]);
  const today = todayInKolkata();
  const filtered = [...search.keys()].some((key) => key !== "cursor");
  const more = new URLSearchParams(search);
  if (page.nextCursor) more.set("cursor", page.nextCursor);

  if (summary.count === 0) {
    return (
      <>
        <TopBar title="Expenses" />
        <main className="flex flex-1 flex-col gap-6 p-4 md:p-8">
          <section className={`p-6 ${cardSurface}`}>
            <EmptyState
              title="No expenses yet"
              description={
                events.length === 0
                  ? "Add your events first; every expense belongs to one."
                  : "Record what's been spent, and payments still due, for each event."
              }
            >
              <ButtonLink href={events.length ? "/expenses/new" : "/events"}>
                {events.length ? "Add expense" : "Go to events"}
              </ButtonLink>
            </EmptyState>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar title="Expenses" />
      <main className="flex flex-1 flex-col gap-6 p-4 md:p-8">
        <div className="flex justify-end">
          <ButtonLink href="/expenses/new">Add expense</ButtonLink>
        </div>

        <section aria-label="Totals">
          <ul className="grid grid-cols-2 gap-4 lg:grid-cols-3 lg:gap-6">
            <li className={`p-4 md:p-6 ${cardSurface}`}>
              <Stat
                label="Spent"
                value={formatRupeesShort(summary.paidPaise)}
                detail={formatRupees(summary.paidPaise)}
              />
            </li>
            <li className={`p-4 md:p-6 ${cardSurface}`}>
              <Stat
                label="Pending"
                value={formatRupeesShort(summary.pendingPaise)}
                detail={
                  summary.nextDue ? (
                    <span className="text-warning">
                      Next: {formatDue(summary.nextDue.dueDate, today)}
                    </span>
                  ) : (
                    "Nothing due"
                  )
                }
              />
            </li>
            <li
              className={`col-span-2 p-4 md:p-6 lg:col-span-1 ${cardSurface}`}
            >
              <Stat
                label="Recorded in all"
                value={formatRupeesShort(summary.totalPaise)}
                detail={`${summary.count} ${summary.count === 1 ? "expense" : "expenses"}`}
              />
            </li>
          </ul>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Spent per event">
            <ul className="divide-y divide-border">
              {summary.byEvent.map((row) => (
                <TotalRow
                  key={row.eventId ?? "none"}
                  name={row.name}
                  paidPaise={row.paidPaise}
                  totalPaise={row.totalPaise}
                  href={`/expenses?eventId=${row.eventId ?? "none"}`}
                />
              ))}
            </ul>
          </Card>
          <Card title="Spent per category">
            <ul className="divide-y divide-border">
              {summary.byCategory.map((row) => (
                <TotalRow
                  key={row.category}
                  name={CATEGORY_LABELS[row.category]}
                  paidPaise={row.paidPaise}
                  totalPaise={row.totalPaise}
                  href={`/expenses?category=${row.category}`}
                />
              ))}
            </ul>
          </Card>
        </div>

        <details className={`p-4 ${cardSurface}`} open={filtered}>
          <summary className="min-h-11 cursor-pointer content-center rounded-control font-medium text-accent focus-visible:outline-2 focus-visible:outline-accent">
            Filter and sort
          </summary>
          <form
            action="/expenses"
            className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <div>
              <label htmlFor="filter-status" className={labelClass}>
                Status
              </label>
              <select
                id="filter-status"
                name="status"
                defaultValue={query.status ?? ""}
                className={fieldClass}
              >
                <option value="">Paid and pending</option>
                <option value="PAID">Paid</option>
                <option value="PENDING">Pending</option>
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
                className={fieldClass}
              >
                <option value="">Any event</option>
                <option value="none">No event</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="filter-category" className={labelClass}>
                Category
              </label>
              <select
                id="filter-category"
                name="category"
                defaultValue={query.category ?? ""}
                className={fieldClass}
              >
                <option value="">Any category</option>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="filter-from" className={labelClass}>
                From
              </label>
              <input
                id="filter-from"
                name="from"
                type="date"
                defaultValue={query.from ?? ""}
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor="filter-to" className={labelClass}>
                To
              </label>
              <input
                id="filter-to"
                name="to"
                type="date"
                defaultValue={query.to ?? ""}
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor="filter-sort" className={labelClass}>
                Sort by
              </label>
              <select
                id="filter-sort"
                name="sort"
                defaultValue={query.sort}
                className={fieldClass}
              >
                <option value="-date">Newest first</option>
                <option value="dueDate">Due date</option>
                <option value="-amountPaise">Largest first</option>
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-3">
              <button type="submit" className={buttonClass()}>
                Apply
              </button>
              <Link href="/expenses" className={buttonClass("secondary")}>
                Clear
              </Link>
            </div>
          </form>
        </details>

        {!parsed.success && (
          <p role="status" className="text-small text-warning">
            Some filters in the address weren&apos;t recognised, so all expenses
            are shown.
          </p>
        )}

        <section className={`p-6 ${cardSurface}`} aria-label="Expense list">
          {page.expenses.length === 0 ? (
            <EmptyState
              title="No expenses match"
              description="Try other filters, or clear them."
            />
          ) : (
            <ExpenseList expenses={page.expenses} today={today} />
          )}
        </section>

        {page.nextCursor && (
          <Link
            href={`/expenses?${more.toString()}`}
            className={`self-start ${buttonClass("secondary")}`}
          >
            Next page
          </Link>
        )}
      </main>
    </>
  );
}
