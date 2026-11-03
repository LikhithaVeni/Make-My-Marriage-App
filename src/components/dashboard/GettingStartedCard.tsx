import { Card, CardLink } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { Dashboard } from "@/modules/dashboard";

export interface ChecklistItem {
  label: string;
  description: string;
  done: boolean;
  href: string;
  /** False until the page exists; shown as "Soon". */
  available: boolean;
}

/** The PRD's new-wedding checklist (key flow F1, step 5), in PRD order. */
export function gettingStartedItems(dashboard: Dashboard): ChecklistItem[] {
  const { totals, tasks } = dashboard;
  return [
    {
      label: "Invite family members",
      description: "Add parents, siblings and friends as Managers.",
      done: totals.members > 1,
      href: "/settings",
      available: false,
    },
    {
      label: "Add events",
      description: "Haldi, Mehendi, Sangeet, Pelli, Reception and more.",
      done: totals.events > 0,
      href: "/events",
      available: false,
    },
    {
      label: "Add tasks",
      description: "Who does what, by when, for each event.",
      done: tasks.todo + tasks.inProgress + tasks.completed > 0,
      href: "/tasks",
      available: false,
    },
    {
      label: "Add guests",
      description: "Households, with how many from each are invited.",
      done: totals.households > 0,
      href: "/guests",
      available: false,
    },
  ];
}

function StatusIcon({ done }: { done: boolean }) {
  if (!done) {
    return (
      <span
        aria-hidden="true"
        className="mt-0.5 size-5 shrink-0 rounded-full border-2 border-border"
      />
    );
  }
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="mt-0.5 size-5 shrink-0 text-success"
    >
      <circle cx="10" cy="10" r="10" fill="currentColor" />
      <path
        d="m6 10.5 2.5 2.5L14 7.5"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Shown until every checklist item is done; then it disappears. */
export function GettingStartedCard({ dashboard }: { dashboard: Dashboard }) {
  const items = gettingStartedItems(dashboard);
  const done = items.filter((item) => item.done).length;
  if (done === items.length) return null;

  return (
    <Card title="Get started" aside={`${done} of ${items.length} done`}>
      <ProgressBar
        value={done}
        max={items.length}
        label="Setup steps done"
        tone="success"
      />
      <ul className="mt-4 divide-y divide-border">
        {items.map((item) => (
          <li key={item.label} className="flex items-start gap-3 py-3">
            <StatusIcon done={item.done} />
            <div className="min-w-0 flex-1">
              <p
                className={
                  item.done ? "text-text-muted line-through" : "text-text"
                }
              >
                <span className="sr-only">
                  {item.done ? "Done: " : "To do: "}
                </span>
                {item.label}
              </p>
              {!item.done && (
                <p className="text-small text-text-muted">{item.description}</p>
              )}
            </div>
            {!item.done &&
              (item.available ? (
                <div className="shrink-0">
                  <CardLink label="Start" href={item.href} available />
                </div>
              ) : (
                <span className="shrink-0 pt-0.5 text-caption text-text-muted">
                  Soon
                </span>
              ))}
          </li>
        ))}
      </ul>
    </Card>
  );
}
