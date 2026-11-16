"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useId, useState } from "react";

import { FormAlert } from "@/components/auth/FormAlert";
import { problemMessage } from "@/components/members/problem-message";
import { buttonClass } from "@/components/ui/ButtonLink";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { TextField } from "@/components/ui/TextField";
import { ApiError, patchJson, postJson } from "@/lib/api-client";
import { fromKolkataInput, toKolkataInput } from "@/lib/format";
import type { EventView } from "@/modules/events";

type Field =
  | "name"
  | "startAt"
  | "endAt"
  | "muhurthamAt"
  | "venueName"
  | "venueAddress"
  | "mapUrl"
  | "dressCode"
  | "instructions"
  | "livestreamUrl";

type Values = Record<Field, string>;

/** Form order, for focusing the first field with a problem. */
const FIELDS: Field[] = [
  "name",
  "startAt",
  "endAt",
  "muhurthamAt",
  "venueName",
  "venueAddress",
  "mapUrl",
  "dressCode",
  "instructions",
  "livestreamUrl",
];

/** The API's field names (`details.fields`) → this form's. */
const FROM_API: Record<string, Field> = {
  name: "name",
  startAt: "startAt",
  endAt: "endAt",
  muhurthamAt: "muhurthamAt",
  "venue.name": "venueName",
  "venue.address": "venueAddress",
  "venue.mapUrl": "mapUrl",
  dressCode: "dressCode",
  instructions: "instructions",
  livestreamUrl: "livestreamUrl",
};

const TIMES: Field[] = ["startAt", "endAt", "muhurthamAt"];

/** The PRD's ceremonies, offered while typing a name (others are fine). */
const SUGGESTED_NAMES = [
  "Haldi",
  "Mehendi",
  "Sangeet",
  "Pelli",
  "Cocktail",
  "Reception",
];

const EMPTY: Values = Object.fromEntries(FIELDS.map((f) => [f, ""])) as Values;

function valuesOf(event: EventView): Values {
  return {
    name: event.name,
    startAt: toKolkataInput(event.startAt),
    endAt: toKolkataInput(event.endAt),
    muhurthamAt: event.muhurthamAt ? toKolkataInput(event.muhurthamAt) : "",
    venueName: event.venue.name,
    venueAddress: event.venue.address,
    // The automatic Google Maps search isn't shown as a typed-in link.
    mapUrl: event.venue.mapUrlCustom ? event.venue.mapUrl : "",
    dressCode: event.dressCode ?? "",
    instructions: event.instructions ?? "",
    livestreamUrl: event.livestreamUrl ?? "",
  };
}

/** The value as the API takes it: times in Asia/Kolkata, text trimmed. */
function apiValue(field: Field, value: string): string {
  return TIMES.includes(field) ? fromKolkataInput(value) : value.trim();
}

/** The request body: every filled field, or only the changed ones. */
function bodyOf(values: Values, saved: Values | null, fields: Field[]) {
  const body: Record<string, unknown> = {};
  const venue: Record<string, string> = {};
  for (const field of fields) {
    const value = values[field].trim();
    if (saved ? value === saved[field].trim() : value === "") continue;
    const converted = apiValue(field, values[field]);
    if (field === "venueName") venue.name = converted;
    else if (field === "venueAddress") venue.address = converted;
    else if (field === "mapUrl") venue.mapUrl = converted;
    else body[field] = converted;
  }
  if (Object.keys(venue).length > 0) body.venue = venue;
  return body;
}

interface EventFormProps {
  /** The event being edited; none when adding one. */
  event?: EventView;
  /** Admins only (PRD "Events": the livestream link is set by an Admin). */
  canSetLivestream: boolean;
}

/** Add or edit an event (PRD "Events", key flow F3; API Design "Events"). */
export function EventForm({ event, canSetLivestream }: EventFormProps) {
  const router = useRouter();
  const listId = useId();
  const saved = event ? valuesOf(event) : null;
  const [values, setValues] = useState<Values>(saved ?? EMPTY);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const fields = FIELDS.filter(
    (field) => field !== "livestreamUrl" || canSetLivestream,
  );
  const body = bodyOf(values, saved, fields);
  const hasChanges = !event || Object.keys(body).length > 0;
  const cancelHref = event ? `/events/${event.id}` : "/events";

  function update(field: Field, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function onSubmit(submitted: FormEvent<HTMLFormElement>) {
    submitted.preventDefault();
    if (!hasChanges) return;
    setProblem(null);
    setPending(true);
    try {
      if (event) {
        await patchJson<EventView>(`/api/v1/events/${event.id}`, body);
        router.push(`/events/${event.id}`);
      } else {
        // A new event sends every required field, even empty, so the server
        // names the missing ones.
        const created = await postJson<EventView>("/api/v1/events", {
          name: values.name.trim(),
          startAt: apiValue("startAt", values.startAt),
          endAt: apiValue("endAt", values.endAt),
          ...body,
          venue: {
            name: values.venueName.trim(),
            address: values.venueAddress.trim(),
            ...(body.venue as object | undefined),
          },
        });
        router.push(`/events/${created.id}`);
      }
      router.refresh();
    } catch (error) {
      setPending(false);
      if (error instanceof ApiError && error.code === "VALIDATION_FAILED") {
        const fromServer = (error.details?.fields ?? {}) as Record<
          string,
          string
        >;
        const mapped: Partial<Record<Field, string>> = {};
        for (const [name, message] of Object.entries(fromServer)) {
          const field = FROM_API[name];
          if (field) mapped[field] = message;
        }
        setErrors(mapped);
        const first = FIELDS.find((name) => mapped[name]);
        if (first) document.getElementsByName(first)[0]?.focus();
        else setProblem(problemMessage(error));
      } else {
        setProblem(problemMessage(error));
      }
    }
  }

  const field = (name: Field) => ({
    name,
    value: values[name],
    error: errors[name],
    onChange: (changed: React.ChangeEvent<HTMLInputElement>) =>
      update(name, changed.target.value),
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {problem && <FormAlert title={problem} />}

      <TextField
        label="Event name"
        list={listId}
        autoComplete="off"
        hint="Haldi, Mehendi, Sangeet, Pelli, Reception, or any name you like."
        {...field("name")}
      />
      <datalist id={listId}>
        {SUGGESTED_NAMES.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Starts"
          type="datetime-local"
          hint="India time (IST)."
          {...field("startAt")}
        />
        <TextField
          label="Ends"
          type="datetime-local"
          hint="Can be the next day, for late-night muhurthams."
          {...field("endAt")}
        />
      </div>

      <TextField
        label="Muhurtham (optional)"
        type="datetime-local"
        hint="The auspicious time, if this event has one."
        {...field("muhurthamAt")}
      />

      <TextField
        label="Venue name"
        autoComplete="off"
        {...field("venueName")}
      />
      <TextAreaField
        label="Venue address"
        name="venueAddress"
        rows={2}
        maxLength={500}
        value={values.venueAddress}
        onChange={(value) => update("venueAddress", value)}
        error={errors.venueAddress}
      />
      <TextField
        label="Map link (optional)"
        type="url"
        inputMode="url"
        placeholder="https://maps.app.goo.gl/…"
        hint="Leave empty to use a Google Maps search for the venue."
        {...field("mapUrl")}
      />

      <TextField
        label="Dress code (optional)"
        autoComplete="off"
        placeholder="e.g. Yellow or pastels"
        {...field("dressCode")}
      />
      <TextAreaField
        label="Instructions for guests (optional)"
        name="instructions"
        maxLength={2000}
        placeholder="e.g. Parking at the back gate"
        hint="Shown to guests on their invitation."
        value={values.instructions}
        onChange={(value) => update("instructions", value)}
        error={errors.instructions}
      />

      {canSetLivestream && (
        <TextField
          label="Livestream link (optional)"
          type="url"
          inputMode="url"
          placeholder="https://youtube.com/live/…"
          hint="A YouTube Live link, for family who can't come."
          {...field("livestreamUrl")}
        />
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={pending || !hasChanges}
          aria-busy={pending}
          className={buttonClass()}
        >
          {pending ? "Saving…" : event ? "Save changes" : "Add event"}
        </button>
        <Link href={cancelHref} className={buttonClass("secondary")}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
