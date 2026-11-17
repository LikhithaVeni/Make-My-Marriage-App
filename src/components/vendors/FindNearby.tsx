"use client";

import { useId, useState } from "react";

import { buttonClass } from "@/components/ui/ButtonLink";
import { findNearbyUrl } from "@/lib/maps";
import { SERVICE_TYPES } from "@/lib/vendor-labels";

interface Venue {
  id: string;
  name: string;
  venue: { name: string; address: string };
}

/**
 * PRD "Find nearby (free)": pick a service and an event; Google Maps opens
 * searching "<service> near <venue>". Chosen vendors are then saved by hand.
 */
export function FindNearby({ events }: { events: Venue[] }) {
  const id = useId();
  const [serviceType, setServiceType] = useState("Catering");
  const [eventId, setEventId] = useState(events[0]?.id ?? "");
  const event = events.find((item) => item.id === eventId);
  const service = serviceType.trim();
  const url = event && service ? findNearbyUrl(service, event.venue) : null;

  if (events.length === 0) {
    return (
      <p className="text-small text-text-muted">
        Add an event with its venue to search near it.
      </p>
    );
  }

  const fieldClass =
    "mt-1.5 h-11 w-full rounded-control border border-border bg-surface px-3 text-body text-text focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-accent";
  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
      <div>
        <label
          htmlFor={`${id}-service`}
          className="text-small font-medium text-text"
        >
          Service
        </label>
        <input
          id={`${id}-service`}
          list={`${id}-services`}
          value={serviceType}
          onChange={(change) => setServiceType(change.target.value)}
          className={fieldClass}
        />
        <datalist id={`${id}-services`}>
          {SERVICE_TYPES.map((type) => (
            <option key={type} value={type} />
          ))}
        </datalist>
      </div>
      {events.length > 1 ? (
        <div>
          <label
            htmlFor={`${id}-event`}
            className="text-small font-medium text-text"
          >
            Near
          </label>
          <select
            id={`${id}-event`}
            value={eventId}
            onChange={(change) => setEventId(change.target.value)}
            className={fieldClass}
          >
            {events.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {item.venue.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <p className="min-w-0 text-small wrap-anywhere text-text-muted sm:pb-3">
          Near {events[0]!.venue.name}
        </p>
      )}
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass("secondary")}
        >
          Search on Google Maps
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      ) : (
        <span
          className={`${buttonClass("secondary")} opacity-70`}
          aria-disabled="true"
        >
          Search on Google Maps
        </span>
      )}
    </div>
  );
}
