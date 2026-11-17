import { redirect } from "next/navigation";
import { connection } from "next/server";

import { CountdownCard } from "@/components/dashboard/CountdownCard";
import { GettingStartedCard } from "@/components/dashboard/GettingStartedCard";
import { MyTasksCard } from "@/components/dashboard/MyTasksCard";
import { PendingPaymentsCard } from "@/components/dashboard/PendingPaymentsCard";
import { RecentActivityCard } from "@/components/dashboard/RecentActivityCard";
import { TotalsRow } from "@/components/dashboard/TotalsRow";
import { UpcomingEventsCard } from "@/components/dashboard/UpcomingEventsCard";
import { WeddingDayContactsCard } from "@/components/dashboard/WeddingDayContactsCard";
import { TopBar } from "@/components/layout/TopBar";
import { readSession } from "@/lib/session";
import { dashboardPolicy, getDashboard } from "@/modules/dashboard";
import { authorize } from "@/platform/rbac";

/**
 * The organisers' home (PRD "Dashboard"): every card from the signed-in
 * wedding's real data; cards whose feature isn't built yet say what they
 * come with (decision 73).
 */
export default async function DashboardPage() {
  // Render per request: the data and the "3 h ago" labels must be current,
  // never frozen at build time.
  await connection();
  const session = await readSession();
  // The photographer has their own upload area (API Design).
  if (session?.result.role === "PHOTOGRAPHER") redirect("/photographer");
  const ctx = authorize(
    session?.context ?? null,
    dashboardPolicy,
    "dashboard.view",
  );
  const dashboard = await getDashboard(ctx);
  // One "today" for every card, taken from the data (docs/decisions.md, 40).
  const { today } = dashboard;

  return (
    <>
      <TopBar title="Dashboard" />
      <main className="flex flex-1 flex-col gap-6 p-4 md:p-8">
        <CountdownCard
          countdown={dashboard.countdown}
          tasks={dashboard.tasks}
        />
        <GettingStartedCard
          dashboard={dashboard}
          canInvite={ctx.role === "ADMIN"}
        />
        <TotalsRow totals={dashboard.totals} money={dashboard.money} />
        <div className="grid gap-6 lg:grid-cols-3">
          <MyTasksCard
            tasks={dashboard.myTasks}
            today={today}
            className="lg:col-span-2"
          />
          <UpcomingEventsCard events={dashboard.upcomingEvents} />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <PendingPaymentsCard money={dashboard.money} today={today} />
          <WeddingDayContactsCard contacts={dashboard.weddingDayContacts} />
        </div>
        <RecentActivityCard activity={dashboard.recentActivity} />
      </main>
    </>
  );
}
