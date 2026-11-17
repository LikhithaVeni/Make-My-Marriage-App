import type { Metadata } from "next";
import Link from "next/link";

import { DeleteExpenseButton } from "@/components/expenses/DeleteExpenseButton";
import { MarkPaidButton } from "@/components/expenses/MarkPaidButton";
import { TopBar } from "@/components/layout/TopBar";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { CATEGORY_LABELS, EXPENSE_STATUS_LABELS } from "@/lib/expense-labels";
import {
  formatDate,
  formatDue,
  formatRupees,
  todayInKolkata,
} from "@/lib/format";

import { expenseOr404, expensesContext } from "../expense-access";

export const metadata: Metadata = {
  title: "Expense · Make My Marriage",
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

/** One expense: what, how much, for which event, who paid, and when due. */
export default async function ExpensePage(props: PageProps<"/expenses/[id]">) {
  const { ctx } = await expensesContext("expenses.view");
  const expense = await expenseOr404(ctx, (await props.params).id);
  const status = EXPENSE_STATUS_LABELS[expense.status];
  const category = CATEGORY_LABELS[expense.category];
  const title = expense.description ?? category;

  return (
    <>
      <TopBar title="Expense" />
      <main className="flex flex-1 flex-col gap-6 p-4 md:p-8">
        <Link href="/expenses" className={`self-start text-small ${linkClass}`}>
          ← Expenses
        </Link>

        <Card
          title={title}
          className="max-w-3xl wrap-anywhere"
          aside={
            <ButtonLink
              href={`/expenses/${expense.id}/edit`}
              variant="secondary"
            >
              Edit
            </ButtonLink>
          }
        >
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <p className="font-display text-title text-text">
              {formatRupees(expense.amountPaise)}
            </p>
            <Badge tone={status.tone}>{status.label}</Badge>
          </div>
          {expense.status === "PENDING" && (
            <div className="mb-6">
              <MarkPaidButton expenseId={expense.id} />
            </div>
          )}
          <dl className="divide-y divide-border">
            {expense.status === "PENDING" && expense.dueDate && (
              <Row label="Due">
                <span className={expense.overdue ? "text-danger" : undefined}>
                  {formatDate(expense.dueDate, "long")} ·{" "}
                  {expense.overdue
                    ? "Overdue"
                    : formatDue(expense.dueDate, todayInKolkata())}
                </span>
              </Row>
            )}
            <Row label="Date">{formatDate(expense.date, "long")}</Row>
            <Row label="Event">
              {expense.event ? (
                <Link
                  href={`/events/${expense.event.id}`}
                  className={linkClass}
                >
                  {expense.event.name}
                </Link>
              ) : (
                <span className="text-text-muted">
                  No event (its event was deleted)
                </span>
              )}
            </Row>
            <Row label="Category">{category}</Row>
            <Row
              label={expense.status === "PAID" ? "Paid by" : "To be paid by"}
            >
              {expense.paidBy}
            </Row>
            {expense.vendor && (
              <Row label="Vendor">
                <Link
                  href={`/vendors/${expense.vendor.id}`}
                  className={linkClass}
                >
                  {expense.vendor.name}
                </Link>
              </Row>
            )}
            {expense.task && (
              <Row label="Task">
                <Link href={`/tasks/${expense.task.id}`} className={linkClass}>
                  {expense.task.title}
                </Link>
              </Row>
            )}
            <Row label="Receipt">
              <span className="text-text-muted">
                Receipt uploads come with file storage.
              </span>
            </Row>
          </dl>
        </Card>

        <div className="max-w-3xl">
          <DeleteExpenseButton
            expenseId={expense.id}
            label={`${formatRupees(expense.amountPaise)} · ${title}`}
          />
        </div>
      </main>
    </>
  );
}
