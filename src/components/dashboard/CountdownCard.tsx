import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatDate } from "@/lib/format";
import type { Dashboard } from "@/modules/dashboard";

/** "451 days to go", "1 day to go", "The wedding is today", "Married 3 days ago". */
export function countdownLabel(daysLeft: number): string {
  if (daysLeft > 1) return `${daysLeft.toLocaleString("en-IN")} days to go`;
  if (daysLeft === 1) return "1 day to go";
  if (daysLeft === 0) return "The wedding is today";
  const ago = -daysLeft;
  return `Married ${ago.toLocaleString("en-IN")} ${ago === 1 ? "day" : "days"} ago`;
}

interface CountdownCardProps {
  countdown: Dashboard["countdown"];
  tasks: Dashboard["tasks"];
}

/**
 * The dashboard's top card: the PRD's Countdown and Task progress cards side by
 * side, as in the Stitch design. The cover image waits for wedding settings.
 */
export function CountdownCard({ countdown, tasks }: CountdownCardProps) {
  const total = tasks.todo + tasks.inProgress + tasks.completed;
  const counts = [
    { label: "To do", value: tasks.todo, danger: false },
    { label: "In progress", value: tasks.inProgress, danger: false },
    { label: "Completed", value: tasks.completed, danger: false },
    { label: "Overdue", value: tasks.overdue, danger: tasks.overdue > 0 },
  ];

  return (
    <section
      aria-labelledby="card-countdown"
      className="rounded-card border border-border bg-surface p-6"
    >
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div>
          <h2
            id="card-countdown"
            className="text-caption font-medium tracking-wider text-text-muted uppercase"
          >
            {countdown.title}
          </h2>
          <p className="mt-2 font-display text-title text-text">
            {countdownLabel(countdown.daysLeft)}
          </p>
          <p className="mt-1 text-small text-text-muted">
            {formatDate(countdown.date, "long")} · {countdown.city}
          </p>
        </div>

        <div className="md:w-80">
          <p className="text-small text-text">
            {tasks.completed} of {total} tasks done
          </p>
          <div className="mt-2">
            <ProgressBar
              value={tasks.completed}
              max={total}
              label="Tasks completed"
            />
          </div>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-6 sm:grid-cols-4">
        {counts.map(({ label, value, danger }) => (
          <div key={label}>
            <dt
              className={`text-small ${danger ? "text-danger" : "text-text-muted"}`}
            >
              {label}
            </dt>
            <dd
              className={`mt-1 font-display text-heading ${danger ? "text-danger" : "text-text"}`}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
