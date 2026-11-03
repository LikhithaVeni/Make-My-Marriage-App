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
import { getDashboard } from "@/modules/dashboard";

export default async function DashboardPage({
  searchParams,
}: PageProps<"/dashboard">) {
  // Render per request: the data and the "3 h ago" labels must be current,
  // never frozen at build time.
  await connection();
  // While the dashboard shows sample data, ?sample=empty previews a brand-new
  // wedding and ?sample=error the error state (docs/decisions.md, decision 45).
  const { sample } = await searchParams;
  const dashboard = await getDashboard({
    sample: sample === "empty" || sample === "error" ? sample : "full",
  });
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
        <GettingStartedCard dashboard={dashboard} />
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
