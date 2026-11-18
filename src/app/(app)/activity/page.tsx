import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { TopBar } from "@/components/layout/TopBar";
import { Badge } from "@/components/ui/Badge";
import { buttonClass } from "@/components/ui/ButtonLink";
import { Card, cardSurface } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDayHeading, formatTime, kolkataDateOf } from "@/lib/format";
import { toSearchParams } from "@/lib/search-params";
import { readSession } from "@/lib/session";
import {
  activityPeople,
  activityPolicy,
  type ActivityView,
  type EntityType,
  listActivity,
  listActivityQuerySchema,
  parseActivityQuery,
} from "@/modules/activity";
import { authorize } from "@/platform/rbac";

export const metadata: Metadata = {
  title: "Activity · Make My Marriage",
};

const fieldClass =
  "mt-1.5 h-11 w-full rounded-control border border-border bg-surface px-3 text-body text-text focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-accent";
const labelClass = "text-small font-medium text-text";

/** The areas there's something to log for so far (PRD "Activity log"). */
const AREAS: { type: EntityType; label: string }[] = [
  { type: "EVENT", label: "Events" },
  { type: "TASK", label: "Tasks" },
  { type: "EXPENSE", label: "Expenses" },
  { type: "VENDOR", label: "Vendors" },
  { type: "MEMBER", label: "Members" },
  { type: "WEDDING", label: "Wedding details" },
];
const AREA_LABEL = Object.fromEntries(
  AREAS.map((area) => [area.type, area.label]),
) as Partial<Record<EntityType, string>>;

/** Where an entry's record lives, while it still exists. */
function linkOf(entry: ActivityView): string | null {
  if (entry.action === "DELETE") return null;
  const paths: Partial<Record<EntityType, string>> = {
    EVENT: `/events/${entry.entity.id}`,
    TASK: `/tasks/${entry.entity.id}`,
    EXPENSE: `/expenses/${entry.entity.id}`,
    VENDOR: `/vendors/${entry.entity.id}`,
  };
  return paths[entry.entity.type] ?? null;
}

/** Entries grouped by their day in India, newest first. */
function byDay(entries: ActivityView[]): [string, ActivityView[]][] {
  const days = new Map<string, ActivityView[]>();
  for (const entry of entries) {
    const day = kolkataDateOf(entry.at);
    days.set(day, [...(days.get(day) ?? []), entry]);
  }
  return [...days.entries()];
}

/**
 * PRD "Activity log": every change with who, what and when, visible to all
 * organisers, filtered by person, area and date (API Design `GET /activity`).
 */
export default async function ActivityPage(props: PageProps<"/activity">) {
  const session = await readSession();
  const role = session?.result.role;
  const roles: readonly string[] = activityPolicy["activity.list"];
  if (!session || !role || !roles.includes(role)) redirect("/dashboard");
  const ctx = authorize(session.context, activityPolicy, "activity.list");

  const search = toSearchParams(await props.searchParams);
  const parsed = parseActivityQuery(search);
  const query = parsed.success
    ? parsed.data
    : listActivityQuerySchema.parse({});
  const [page, people] = await Promise.all([
    listActivity(ctx, query).catch(() =>
      listActivity(ctx, listActivityQuerySchema.parse({})),
    ),
    activityPeople(ctx),
  ]);
  const filtered = [...search.keys()].some((key) => key !== "cursor");
  const older = new URLSearchParams(search);
  if (page.nextCursor) older.set("cursor", page.nextCursor);

  return (
    <>
      <TopBar title="Activity" />
      <main className="flex flex-1 flex-col gap-6 p-4 md:p-8">
        <details className={`p-4 ${cardSurface}`} open={filtered}>
          <summary className="min-h-11 cursor-pointer content-center rounded-control font-medium text-accent focus-visible:outline-2 focus-visible:outline-accent">
            Filter by person, area and date
          </summary>
          <form
            action="/activity"
            className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <div>
              <label htmlFor="filter-person" className={labelClass}>
                Person
              </label>
              <select
                id="filter-person"
                name="actorId"
                defaultValue={query.actorId ?? ""}
                className={fieldClass}
              >
                <option value="">Everyone</option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="filter-area" className={labelClass}>
                Area
              </label>
              <select
                id="filter-area"
                name="entityType"
                defaultValue={query.entityType ?? ""}
                className={fieldClass}
              >
                <option value="">Everything</option>
                {AREAS.map((area) => (
                  <option key={area.type} value={area.type}>
                    {area.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="filter-from" className={labelClass}>
                From
              </label>
              <input
                id="filter-from"
                name="from"
                type="date"
                defaultValue={query.from ?? ""}
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor="filter-to" className={labelClass}>
                To
              </label>
              <input
                id="filter-to"
                name="to"
                type="date"
                defaultValue={query.to ?? ""}
                className={fieldClass}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-4">
              <button type="submit" className={buttonClass()}>
                Apply
              </button>
              <Link href="/activity" className={buttonClass("secondary")}>
                Clear
              </Link>
            </div>
          </form>
        </details>

        {!parsed.success && (
          <p role="status" className="text-small text-warning">
            Some filters in the address weren&apos;t recognised, so everything
            is shown.
          </p>
        )}

        {page.entries.length === 0 ? (
          <section className={`p-6 ${cardSurface}`}>
            <EmptyState
              title={filtered ? "Nothing matches" : "Nothing yet"}
              description={
                filtered
                  ? "Try another person, area or date."
                  : "Every change the family makes to events, tasks, expenses, vendors and members shows here."
              }
            />
          </section>
        ) : (
          byDay(page.entries).map(([day, entries]) => (
            <Card key={day} title={formatDayHeading(day)}>
              <ul className="divide-y divide-border">
                {entries.map((entry) => {
                  const href = linkOf(entry);
                  const content = (
                    <>
                      <span
                        aria-hidden="true"
                        className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-tint font-display text-small font-medium text-accent"
                      >
                        {entry.actor.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1 wrap-anywhere">
                        <span className="block text-text">{entry.summary}</span>
                        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-text-muted">
                          <time dateTime={entry.at}>
                            {formatTime(entry.at)}
                          </time>
                          {AREA_LABEL[entry.entity.type] && (
                            <Badge>{AREA_LABEL[entry.entity.type]}</Badge>
                          )}
                        </span>
                      </span>
                    </>
                  );
                  return (
                    <li key={entry.id} className="py-1 first:pt-0 last:pb-0">
                      {href ? (
                        <Link
                          href={href}
                          className="-mx-3 flex items-start gap-3 rounded-control px-3 py-2 hover:bg-accent-tint focus-visible:outline-2 focus-visible:outline-accent"
                        >
                          {content}
                        </Link>
                      ) : (
                        <div className="flex items-start gap-3 py-2">
                          {content}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          ))
        )}

        {page.nextCursor && (
          <Link
            href={`/activity?${older.toString()}`}
            className={`self-start ${buttonClass("secondary")}`}
          >
            Older
          </Link>
        )}
      </main>
    </>
  );
}
