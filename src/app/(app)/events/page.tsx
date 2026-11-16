import type { Metadata } from "next";
import Link from "next/link";

import { TopBar } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card, cardSurface } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  formatDayHeading,
  formatTimeFrom,
  formatTimeRange,
  kolkataDateOf,
} from "@/lib/format";
import { type EventView, listEvents } from "@/modules/events";

import { can, eventsContext } from "./event-access";

export const metadata: Metadata = {
  title: "Events · Make My Marriage",
};

/** Events grouped by their day in Asia/Kolkata, in schedule order. */
function byDay(events: EventView[]): [string, EventView[]][] {
  const days = new Map<string, EventView[]>();
  for (const event of events) {
    const day = kolkataDateOf(event.startAt);
    days.set(day, [...(days.get(day) ?? []), event]);
  }
  return [...days.entries()];
}

/** PRD "Events": the events list in chronological order, as a schedule. */
export default async function EventsPage() {
  const ctx = await eventsContext("events.view");
  const events = await listEvents(ctx);
  const canAdd = can(ctx.role, "events.create");

  return (
    <>
      <TopBar title="Events" />
      <main className="flex flex-1 flex-col gap-6 p-4 md:p-8">
        {events.length === 0 ? (
          <section className={`p-6 ${cardSurface}`}>
            <EmptyState
              title="No events yet"
              description={
                canAdd
                  ? "Add Haldi, Mehendi, Sangeet, Pelli and the rest, with times, venues and dress codes."
                  : "An Admin adds the events; you'll see the schedule here."
              }
            >
              {canAdd && <ButtonLink href="/events/new">Add event</ButtonLink>}
            </EmptyState>
          </section>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-text-muted">
                {events.length === 1 ? "1 event" : `${events.length} events`},
                earliest first. Times are in India time (IST).
              </p>
              {canAdd && <ButtonLink href="/events/new">Add event</ButtonLink>}
            </div>

            {byDay(events).map(([day, dayEvents]) => (
              <Card key={day} title={formatDayHeading(day)}>
                <ul className="divide-y divide-border">
                  {dayEvents.map((event) => (
                    <li key={event.id} className="py-3 first:pt-0 last:pb-0">
                      <Link
                        href={`/events/${event.id}`}
                        className="-mx-3 flex flex-col gap-1 rounded-control px-3 py-2 hover:bg-accent-tint focus-visible:outline-2 focus-visible:outline-accent sm:flex-row sm:items-baseline sm:gap-6"
                      >
                        <span className="shrink-0 text-small text-text-muted sm:w-56">
                          {formatTimeRange(event.startAt, event.endAt)}
                        </span>
                        <span className="min-w-0 wrap-anywhere">
                          <span className="block font-medium text-accent">
                            {event.name}
                          </span>
                          <span className="block text-small text-text-muted">
                            {event.venue.name}
                          </span>
                          {event.muhurthamAt && (
                            <span className="block text-caption text-text-muted">
                              Muhurtham:{" "}
                              {formatTimeFrom(event.startAt, event.muhurthamAt)}
                            </span>
                          )}
                          {event.dressCode && (
                            <span className="block text-caption text-text-muted">
                              Dress code: {event.dressCode}
                            </span>
                          )}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </>
        )}
      </main>
    </>
  );
}
