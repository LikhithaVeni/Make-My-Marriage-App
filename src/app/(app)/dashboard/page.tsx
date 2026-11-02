import { TopBar } from "@/components/layout/TopBar";

export default function DashboardPage() {
  return (
    <>
      <TopBar title="Dashboard" />
      <main className="flex-1 p-4 md:p-8">
        <section className="rounded-card border border-border bg-surface p-6 md:p-8">
          <p className="text-text-muted">Dashboard coming soon</p>
        </section>
      </main>
    </>
  );
}
