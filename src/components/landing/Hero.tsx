import { cardSurface } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ProgressBar } from "@/components/ui/ProgressBar";

// An illustration of the dashboard, not live data: the landing page is public,
// so it must never show a real wedding (docs/decisions.md, decision 47). The
// figures match the dashboard's sample so the two pages tell the same story.
const preview = {
  daysLeft: 451,
  tasksDone: 31,
  tasksTotal: 82,
  stats: [
    { value: "5", label: "Ceremonies" },
    { value: "14", label: "Vendors" },
    { value: "₹18.5 L", label: "Spent" },
  ],
  priorities: [
    { title: "Book mehendi artist for cousins", owner: "Venu" },
    { title: "Shortlist caterers for the Pelli lunch", owner: "Karthik" },
  ],
  next: "Haldi · 26 Jan 2028, 9:00 AM",
};

function DashboardPreview() {
  return (
    <div aria-hidden="true" className={`min-w-0 p-4 ${cardSurface}`}>
      <div className="flex items-center gap-1.5 border-b border-border pb-3">
        <span className="size-2 rounded-full bg-border" />
        <span className="size-2 rounded-full bg-border" />
        <span className="size-2 rounded-full bg-border" />
        <span className="ml-auto text-caption text-text-muted">Dashboard</span>
      </div>
      <div className="mt-4 flex flex-col gap-3 rounded-control bg-bg p-3">
        <div className={`p-4 ${cardSurface}`}>
          <p className="font-display text-heading text-text">
            {preview.daysLeft} days to go
          </p>
          <p className="mt-1 text-caption text-text-muted">
            {preview.tasksDone} of {preview.tasksTotal} tasks done
          </p>
          <div className="mt-2">
            <ProgressBar
              value={preview.tasksDone}
              max={preview.tasksTotal}
              label="Tasks done"
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {preview.stats.map((stat) => (
            <div
              key={stat.label}
              className={`px-1 py-3 text-center ${cardSurface}`}
            >
              <p className="font-display text-body whitespace-nowrap text-accent sm:text-heading">
                {stat.value}
              </p>
              <p className="text-caption text-text-muted">{stat.label}</p>
            </div>
          ))}
        </div>
        <div className={`p-4 ${cardSurface}`}>
          <p className="text-small font-medium text-text">
            Today&apos;s priorities
          </p>
          <ul className="mt-2 divide-y divide-border">
            {preview.priorities.map((task) => (
              <li
                key={task.title}
                className="flex items-center gap-2 py-2 text-small"
              >
                <span className="size-3.5 shrink-0 rounded-full border-2 border-accent" />
                <span className="min-w-0 flex-1 truncate text-text">
                  {task.title}
                </span>
                <span className="shrink-0 text-text-muted">{task.owner}</span>
              </li>
            ))}
          </ul>
        </div>
        <div
          className={`flex flex-wrap justify-between gap-2 p-3 text-small ${cardSurface}`}
        >
          <span className="text-text-muted">Next ceremony</span>
          <span className="font-medium text-text">{preview.next}</span>
        </div>
      </div>
    </div>
  );
}

/** Headline, the two calls to action and a picture of the dashboard. */
export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-12 md:px-8 md:py-20 lg:grid-cols-2"
    >
      <div className="min-w-0">
        <p className="text-caption font-medium tracking-wider text-accent uppercase">
          KaLi&apos;s era · 28 January 2028
        </p>
        <h1
          id="hero-title"
          className="mt-4 font-display text-title text-text md:text-display"
        >
          From Haldi to Reception, nothing slips through.
        </h1>
        <p className="mt-4 max-w-lg text-text-muted">
          One private workspace for our family to plan every event, guest, rupee
          and memory, so the wedding day feels easy.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/dashboard">Open dashboard</ButtonLink>
          <ButtonLink href="#how-it-works" variant="secondary">
            See how it works
          </ButtonLink>
        </div>
      </div>
      <DashboardPreview />
    </section>
  );
}
