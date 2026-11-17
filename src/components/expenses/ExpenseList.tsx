import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { CATEGORY_LABELS, EXPENSE_STATUS_LABELS } from "@/lib/expense-labels";
import { formatDate, formatDue, formatRupees } from "@/lib/format";
import type { ExpenseView } from "@/modules/expenses";

/**
 * Expense rows: amount, what it was for, category, event, who paid, and
 * Paid or Pending with its due date (Overdue in red). Each row opens the
 * expense.
 */
export function ExpenseList({
  expenses,
  today,
  showEvent = true,
}: {
  expenses: ExpenseView[];
  /** Today in India, for "Due in 3 days". */
  today: string;
  /** Off on an event's own page. */
  showEvent?: boolean;
}) {
  return (
    <ul className="divide-y divide-border">
      {expenses.map((expense) => {
        const status = EXPENSE_STATUS_LABELS[expense.status];
        const category = CATEGORY_LABELS[expense.category];
        return (
          <li key={expense.id} className="py-2 first:pt-0 last:pb-0">
            <Link
              href={`/expenses/${expense.id}`}
              className="-mx-3 flex items-start justify-between gap-4 rounded-control px-3 py-2 hover:bg-accent-tint focus-visible:outline-2 focus-visible:outline-accent"
            >
              <span className="min-w-0 wrap-anywhere">
                <span className="block font-medium text-text">
                  {expense.description ?? category}
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-text-muted">
                  <span>{formatDate(expense.date)}</span>
                  {expense.description && <span>{category}</span>}
                  {showEvent && (
                    <Badge>{expense.event?.name ?? "No event"}</Badge>
                  )}
                  <span>
                    {expense.status === "PAID" ? "Paid by" : "To be paid by"}{" "}
                    {expense.paidBy}
                  </span>
                  {expense.status === "PENDING" && expense.dueDate && (
                    <span
                      className={expense.overdue ? "text-danger" : undefined}
                    >
                      {expense.overdue
                        ? `Overdue · was due ${formatDate(expense.dueDate)}`
                        : formatDue(expense.dueDate, today)}
                    </span>
                  )}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                <span className="font-medium text-text">
                  {formatRupees(expense.amountPaise)}
                </span>
                <Badge tone={status.tone}>{status.label}</Badge>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
