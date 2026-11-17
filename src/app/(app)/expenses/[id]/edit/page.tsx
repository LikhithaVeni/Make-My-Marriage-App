import type { Metadata } from "next";
import Link from "next/link";

import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/Card";
import { todayInKolkata } from "@/lib/format";
import { eventNamesOf } from "@/modules/events";
import { taskTitlesOf } from "@/modules/tasks";
import { organisersOf } from "@/modules/wedding";

import { expenseOr404, expensesContext } from "../../expense-access";

export const metadata: Metadata = {
  title: "Edit expense · Make My Marriage",
};

/** Edit an expense or mark it paid (API Design `PATCH /expenses/{id}`). */
export default async function EditExpensePage(
  props: PageProps<"/expenses/[id]/edit">,
) {
  const { ctx, myName } = await expensesContext("expenses.update");
  const expense = await expenseOr404(ctx, (await props.params).id);
  const [events, tasks, organisers] = await Promise.all([
    eventNamesOf(ctx),
    taskTitlesOf(ctx),
    organisersOf(ctx),
  ]);

  return (
    <>
      <TopBar title="Edit expense" />
      <main className="flex flex-1 flex-col gap-6 p-4 md:p-8">
        <Link
          href={`/expenses/${expense.id}`}
          className="self-start rounded-control text-small font-medium text-accent hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-accent"
        >
          ← Expense
        </Link>
        <Card title="Expense" className="max-w-3xl">
          <ExpenseForm
            expense={expense}
            events={events}
            tasks={tasks}
            organisers={organisers.map((person) => person.name)}
            myName={myName}
            today={todayInKolkata()}
          />
        </Card>
      </main>
    </>
  );
}
