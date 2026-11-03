import { CountdownCard } from "@/components/dashboard/CountdownCard";
import { TopBar } from "@/components/layout/TopBar";
import { getDashboard } from "@/modules/dashboard";

export default async function DashboardPage() {
  const dashboard = await getDashboard();

  return (
    <>
      <TopBar title="Dashboard" />
      <main className="flex flex-1 flex-col gap-6 p-4 md:p-8">
        <CountdownCard
          countdown={dashboard.countdown}
          tasks={dashboard.tasks}
        />
      </main>
    </>
  );
}
