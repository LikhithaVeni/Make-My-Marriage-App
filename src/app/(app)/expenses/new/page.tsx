import type { Metadata } from "next";
import Link from "next/link";

import { ExpenseForm } from "@/components/expenses/ExpenseForm";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/Card";
import { todayInKolkata } from "@/lib/format";
import { eventNamesOf } from "@/modules/events";
import { taskTitlesOf } from "@/modules/tasks";
import { organisersOf } from "@/modules/wedding";

import { expensesContext } from "../expense-access";

export const metadata: Metadata = {
  title: "Add expense · Make My Marriage",
};

/** PRD key flow F4: record an advance, a balance or any other expense. */
export default async function NewExpensePage(
  props: PageProps<"/expenses/new">,
) {
  const { ctx, myName } = await expensesContext("expenses.create");
  const [events, tasks, organisers, params] = await Promise.all([
    eventNamesOf(ctx),
    taskTitlesOf(ctx),
    organisersOf(ctx),
    props.searchParams,
  ]);
  const fromEvent = events.find((event) => event.id === params.eventId);

  return (
    <>
      <TopBar title="Add expense" />
      <main className="flex flex-1 flex-col gap-6 p-4 md:p-8">
        <Link
          href={fromEvent ? `/events/${fromEvent.id}` : "/expenses"}
          className="self-start rounded-control text-small font-medium wrap-anywhere text-accent hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-accent"
        >
          ← {fromEvent ? fromEvent.name : "Expenses"}
        </Link>
        <Card title="Expense" className="max-w-3xl">
          <ExpenseForm
            events={events}
            tasks={tasks}
            organisers={organisers.map((person) => person.name)}
            myName={myName}
            today={todayInKolkata()}
            defaultEventId={fromEvent?.id}
          />
        </Card>
      </main>
    </>
  );
}
