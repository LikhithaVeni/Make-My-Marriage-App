import type { Metadata } from "next";
import Link from "next/link";

import { DeleteEventButton } from "@/components/events/DeleteEventButton";
import { TopBar } from "@/components/layout/TopBar";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import {
  formatDayHeading,
  formatTimeFrom,
  formatTimeRange,
  kolkataDateOf,
} from "@/lib/format";

import { can, eventOr404, eventsContext } from "../event-access";

export const metadata: Metadata = {
  title: "Event · Make My Marriage",
};

const linkClass =
  "rounded-control font-medium text-accent hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-accent";

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 py-4 first:pt-0 last:pb-0 sm:flex-row sm:gap-6">
      <dt className="shrink-0 text-small text-text-muted sm:w-40">{label}</dt>
      <dd className="min-w-0 text-text">{children}</dd>
    </div>
  );
}

/**
 * PRD "Event detail": the event's details. Tasks, expenses, guests and photos
 * for the event join this page as those features arrive (decision 70).
 */
export default async function EventPage(props: PageProps<"/events/[id]">) {
  const ctx = await eventsContext("events.view");
  const event = await eventOr404(ctx, (await props.params).id);
  const startDay = kolkataDateOf(event.startAt);

  return (
    <>
      <TopBar title={event.name} />
      <main className="flex flex-1 flex-col gap-6 p-4 md:p-8">
        <Link href="/events" className={`self-start text-small ${linkClass}`}>
          ← Events
        </Link>

        <Card
          title="Details"
          className="max-w-3xl"
          aside={
            can(ctx.role, "events.update") ? (
              <ButtonLink href={`/events/${event.id}/edit`} variant="secondary">
                Edit details
              </ButtonLink>
            ) : undefined
          }
        >
          <dl className="divide-y divide-border">
            <Row label="When">
              <p>{formatDayHeading(startDay)}</p>
              <p className="text-small text-text-muted">
                {formatTimeRange(event.startAt, event.endAt)} · India time (IST)
              </p>
            </Row>
            {event.muhurthamAt && (
              <Row label="Muhurtham">
                {formatTimeFrom(event.startAt, event.muhurthamAt)}
              </Row>
            )}
            <Row label="Venue">
              <p className="font-medium">{event.venue.name}</p>
              <p className="text-small whitespace-pre-line text-text-muted">
                {event.venue.address}
              </p>
              <a
                href={event.venue.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-1 inline-block text-small ${linkClass}`}
              >
                Open in Google Maps
                <span aria-hidden="true"> ↗</span>
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </Row>
            {event.dressCode && <Row label="Dress code">{event.dressCode}</Row>}
            {event.instructions && (
              <Row label="Instructions">
                <p className="whitespace-pre-line">{event.instructions}</p>
                <p className="mt-1 text-caption text-text-muted">
                  Shown to guests on their invitation.
                </p>
              </Row>
            )}
            {event.livestreamUrl && (
              <Row label="Livestream">
                <a
                  href={event.livestreamUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-small break-all ${linkClass}`}
                >
                  {event.livestreamUrl}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </Row>
            )}
          </dl>
        </Card>

        {can(ctx.role, "events.delete") && (
          <div className="max-w-3xl">
            <DeleteEventButton eventId={event.id} name={event.name} />
          </div>
        )}
      </main>
    </>
  );
}
