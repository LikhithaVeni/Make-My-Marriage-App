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
  /** Once done, what was added: "2 events added". */
  doneNote: string;
  /** Once done, where to see them; null when the viewer can't open it. */
  viewHref: string | null;
}

/** "1 event added", "3 tasks added". */
function added(count: number, one: string, many: string, verb = "added") {
  return `${count} ${count === 1 ? one : many} ${verb}`;
}

/**
 * The PRD's new-wedding checklist (key flow F1, step 5), in PRD order.
 * Inviting is for Admins (PRD "Roles and permissions"); guests wait for the
 * guest list (decision 73).
 */
export function gettingStartedItems(
  dashboard: Dashboard,
  { canInvite = false }: { canInvite?: boolean } = {},
): ChecklistItem[] {
  const { totals, tasks } = dashboard;
  const taskCount = tasks.todo + tasks.inProgress + tasks.completed;
  const joined = totals.members - 1;
  return [
    {
      label: "Invite family members",
      description: "Add parents, siblings and friends as Managers.",
      done: joined > 0,
      href: "/settings/members",
      available: canInvite,
      doneNote: added(joined, "family member", "family members", "joined"),
      // Settings is for Admins (PRD screens).
      viewHref: canInvite ? "/settings/members" : null,
    },
    {
      label: "Add events",
      description: "Haldi, Mehendi, Sangeet, Pelli, Reception and more.",
      done: totals.events > 0,
      href: "/events/new",
      available: canInvite,
      doneNote: added(totals.events, "event", "events"),
      viewHref: "/events",
    },
    {
      label: "Add tasks",
      description: "Who does what, by when, for each event.",
      done: taskCount > 0,
      href: "/tasks/new",
      available: true,
      doneNote: added(taskCount, "task", "tasks"),
      viewHref: "/tasks",
    },
    {
      label: "Add guests",
      description: "Households, with how many from each are invited.",
      done: (totals.households ?? 0) > 0,
      href: "/guests",
      available: false,
      doneNote: added(totals.households ?? 0, "household", "households"),
      viewHref: "/guests",
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
        className="stroke-surface"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Shown until every step that can be done today is done; then it disappears
 * (decision 73). Steps the viewer can't do yet show "Soon"; finished steps
 * keep a green tick, say what was added and link to it (decision 76).
 */
export function GettingStartedCard({
  dashboard,
  canInvite = false,
}: {
  dashboard: Dashboard;
  /** Admins invite members and add events (PRD "Roles and permissions"). */
  canInvite?: boolean;
}) {
  const items = gettingStartedItems(dashboard, { canInvite });
  const done = items.filter((item) => item.done).length;
  if (items.every((item) => item.done || !item.available)) return null;

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
              <p className="text-text">
                <span className="sr-only">
                  {item.done ? "Done: " : "To do: "}
                </span>
                {item.label}
              </p>
              {item.done ? (
                <p className="text-small text-success">{item.doneNote}</p>
              ) : (
                <p className="text-small text-text-muted">{item.description}</p>
              )}
            </div>
            {item.done ? (
              item.viewHref && (
                <div className="shrink-0">
                  <CardLink label="View" href={item.viewHref} available />
                </div>
              )
            ) : item.available ? (
              <div className="shrink-0">
                <CardLink label="Start" href={item.href} available />
              </div>
            ) : (
              <span className="shrink-0 pt-0.5 text-caption text-text-muted">
                Soon
              </span>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
