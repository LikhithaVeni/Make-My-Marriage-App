// Dashboard business logic: builds the dashboard from other modules'
// services (decision 42; API Design `GET /dashboard`). It owns no
// collections. Parts whose feature isn't built yet are `null`, so their
// cards say what they come with (decision 73). Callers outside this module
// reach it only through index.ts.
import "server-only";

import { daysBetween, todayInKolkata } from "@/lib/format";
import { eventOverview } from "@/modules/events";
import { taskOverview } from "@/modules/tasks";
import { getWedding, organisersOf } from "@/modules/wedding";
import type { WeddingContext } from "@/platform/rbac";

import { type Dashboard, dashboardSchema, MY_TASKS_LIMIT } from "./schemas";

/** Every card's data in one call, for the signed-in member's wedding. */
export async function getDashboard(
  ctx: WeddingContext,
  now = new Date(),
): Promise<Dashboard> {
  const today = todayInKolkata(now);
  const [wedding, organisers, events, tasks] = await Promise.all([
    getWedding(ctx),
    organisersOf(ctx),
    eventOverview(ctx, now),
    taskOverview(ctx, now, MY_TASKS_LIMIT),
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
      vendors: null,
      households: null,
      people: null,
    },
    rsvp: null,
    money: null,
    weddingDayContacts: null,
    recentActivity: null,
  } satisfies Dashboard);
}
