import { connection } from "next/server";

import { CountdownCard } from "@/components/dashboard/CountdownCard";
import { MyTasksCard } from "@/components/dashboard/MyTasksCard";
import { PendingPaymentsCard } from "@/components/dashboard/PendingPaymentsCard";
import { TotalsRow } from "@/components/dashboard/TotalsRow";
import { UpcomingEventsCard } from "@/components/dashboard/UpcomingEventsCard";
import { TopBar } from "@/components/layout/TopBar";
import { todayInKolkata } from "@/lib/format";
import { getDashboard } from "@/modules/dashboard";

export default async function DashboardPage() {
  // Render per request, so "today" (due-date labels) is never the build date.
  await connection();
  const dashboard = await getDashboard();
  const today = todayInKolkata();

  return (
    <>
      <TopBar title="Dashboard" />
      <main className="flex flex-1 flex-col gap-6 p-4 md:p-8">
        <CountdownCard
          countdown={dashboard.countdown}
          tasks={dashboard.tasks}
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
        <div className="grid gap-6 lg:grid-cols-3">
          <PendingPaymentsCard money={dashboard.money} today={today} />
        </div>
      </main>
    </>
  );
}
