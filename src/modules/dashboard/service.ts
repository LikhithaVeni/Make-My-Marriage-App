// Dashboard business logic: builds the dashboard from other modules'
// services (decision 42; API Design `GET /dashboard`). It owns no
// collections. Parts whose feature isn't built yet are `null`, so their
// cards say what they come with (decision 73). Callers outside this module
// reach it only through index.ts.
import "server-only";

import { daysBetween, todayInKolkata } from "@/lib/format";
import { eventOverview } from "@/modules/events";
import { expenseSummary } from "@/modules/expenses";
import { taskOverview } from "@/modules/tasks";
import { vendorCount, weddingDayContacts } from "@/modules/vendors";
import { getWedding, organisersOf } from "@/modules/wedding";
import type { WeddingContext } from "@/platform/rbac";

import { type Dashboard, dashboardSchema, MY_TASKS_LIMIT } from "./schemas";

/** Every card's data in one call, for the signed-in member's wedding. */
export async function getDashboard(
  ctx: WeddingContext,
  now = new Date(),
): Promise<Dashboard> {
  const today = todayInKolkata(now);
  const [wedding, organisers, events, tasks, expenses, vendors, contacts] =
    await Promise.all([
      getWedding(ctx),
      organisersOf(ctx),
      eventOverview(ctx, now),
      taskOverview(ctx, now, MY_TASKS_LIMIT),
      expenseSummary(ctx),
      vendorCount(ctx),
      weddingDayContacts(ctx),
    ]);

  return dashboardSchema.parse({
    today,
    countdown: {
      date: wedding.date,
      daysLeft: daysBetween(today, wedding.date),
      title: wedding.title,
      city: wedding.city,
      // The cover image arrives with photo storage (decision 66).
      coverUrl: null,
    },
    myTasks: tasks.mine,
    tasks: tasks.counts,
    upcomingEvents: events.upcoming,
    totals: {
      members: organisers.length,
      events: events.count,
      vendors,
      households: null,
      people: null,
    },
    rsvp: null,
    // "Spent" is what's Paid; "pending" what's Pending (decision 39).
    money: {
      spentPaise: expenses.paidPaise,
      pendingPaise: expenses.pendingPaise,
      nextDue: expenses.nextDue && {
        description: expenses.nextDue.description,
        dueDate: expenses.nextDue.dueDate,
      },
      pendingPayments: expenses.pendingPayments,
    },
    weddingDayContacts: contacts.slice(0, 4),
    recentActivity: null,
  } satisfies Dashboard);
}
