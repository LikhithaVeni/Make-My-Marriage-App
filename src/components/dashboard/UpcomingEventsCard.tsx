import { Card, CardLink } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { dateParts, formatTime, kolkataDateOf } from "@/lib/format";
import type { Dashboard } from "@/modules/dashboard";

interface UpcomingEventsCardProps {
  events: Dashboard["upcomingEvents"];
  className?: string;
}

/** The next 3 events with date, time, venue and dress code (PRD, "Upcoming events"). */
export function UpcomingEventsCard({
  events,
  className,
}: UpcomingEventsCardProps) {
  return (
    <Card
      title="Upcoming events"
      className={className}
      aside={events.length > 0 ? `Next ${events.length}` : undefined}
      footer={
        <CardLink label="View all events" href="/events" available={false} />
      }
    >
      {events.length === 0 ? (
        <EmptyState
          title="No upcoming events"
          description="Add Haldi, Mehendi, Sangeet and the rest to see them here."
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {events.map((event) => {
            const { weekday, day, month } = dateParts(
              kolkataDateOf(event.startAt),
            );
            return (
              <li key={event.id} className="flex gap-4">
                <div
                  aria-hidden="true"
                  className="flex w-14 shrink-0 flex-col items-center rounded-control border border-border bg-bg py-2"
                >
                  <span className="text-caption font-medium text-text-muted uppercase">
                    {month}
                  </span>
                  <span className="font-display text-heading text-text">
                    {day}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-text">{event.name}</p>
                  <p className="text-small text-text-muted">
                    <span className="sr-only">
                      {weekday} {day} {month},{" "}
                    </span>
                    {formatTime(event.startAt)} – {formatTime(event.endAt)} ·{" "}
                    {event.venueName}
                  </p>
                  {event.dressCode && (
                    <p className="mt-1 text-caption text-text-muted">
                      Dress code: {event.dressCode}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
