import type { Metadata } from "next";
import Link from "next/link";

import { EventForm } from "@/components/events/EventForm";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/Card";

import { can, eventOr404, eventsContext } from "../../event-access";

export const metadata: Metadata = {
  title: "Edit event · Make My Marriage",
};

/** PRD "Events": Admins and Managers edit details; the livestream is Admin only. */
export default async function EditEventPage(
  props: PageProps<"/events/[id]/edit">,
) {
  const ctx = await eventsContext("events.update");
  const event = await eventOr404(ctx, (await props.params).id);

  return (
    <>
      <TopBar title={`Edit ${event.name}`} />
      <main className="flex flex-1 flex-col gap-6 p-4 md:p-8">
        <Link
          href={`/events/${event.id}`}
          className="self-start rounded-control text-small font-medium text-accent hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-accent"
        >
          ← {event.name}
        </Link>
        <Card title="Event details" className="max-w-3xl">
          <EventForm
            event={event}
            canSetLivestream={can(ctx.role, "events.livestream")}
          />
        </Card>
      </main>
    </>
  );
}
