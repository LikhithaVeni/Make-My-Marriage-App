import { TopBar } from "@/components/layout/TopBar";
import { cardSurface } from "@/components/ui/Card";

function Block({ className }: { className: string }) {
  return (
    <div className={`${cardSurface} ${className}`}>
      <div className="m-6 h-4 w-1/3 rounded-full bg-border motion-safe:animate-pulse" />
    </div>
  );
}

/** Skeleton in the dashboard's shape, shown while its data loads. */
export default function DashboardLoading() {
  return (
    <>
      <TopBar title="Dashboard" />
      <main aria-busy="true" className="flex flex-1 flex-col gap-6 p-4 md:p-8">
        <span role="status" className="sr-only">
          Loading the dashboard…
        </span>
        <Block className="h-56 md:h-60" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
          <Block className="h-36" />
          <Block className="h-36" />
          <Block className="h-36" />
          <Block className="h-36" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Block className="h-80 lg:col-span-2" />
          <Block className="h-80" />
        </div>
      </main>
    </>
  );
}
