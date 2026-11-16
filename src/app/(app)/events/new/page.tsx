import type { Metadata } from "next";
import Link from "next/link";

import { EventForm } from "@/components/events/EventForm";
import { TopBar } from "@/components/layout/TopBar";
import { Card } from "@/components/ui/Card";

import { can, eventsContext } from "../event-access";

export const metadata: Metadata = {
  title: "Add event · Make My Marriage",
};

/** PRD key flow F3, step 1: an Admin creates an event. */
export default async function NewEventPage() {
  const ctx = await eventsContext("events.create");

  return (
    <>
      <TopBar title="Add event" />
      <main className="flex flex-1 flex-col gap-6 p-4 md:p-8">
        <Link
          href="/events"
          className="self-start rounded-control text-small font-medium text-accent hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-accent"
        >
          ← Events
        </Link>
        <Card title="Event details" className="max-w-3xl">
          <EventForm canSetLivestream={can(ctx.role, "events.livestream")} />
        </Card>
      </main>
    </>
  );
}
