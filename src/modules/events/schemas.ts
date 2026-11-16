// Zod request schemas for the events endpoints (docs/API Design v1.md,
// "Events"; fields from the PRD's "Events" table and Database Design's
// "Field rules"). Times are ISO instants with an offset; the app sends them
// in Asia/Kolkata (+05:30).
import { z } from "zod";

const required = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `Enter ${label}`)
    .max(max, `Use at most ${max} characters`);

/** Optional text; an empty string clears it on edit. */
const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use at most ${max.toLocaleString("en-IN")} characters`);

const instant = (label: string) =>
  z.iso.datetime({ offset: true, error: `Choose the ${label}` });

function isWebUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

/** Database Design: "livestreamUrl is a youtube.com or youtu.be URL". */
export function isYouTubeUrl(value: string): boolean {
  try {
    const { protocol, hostname } = new URL(value);
    return (
      protocol === "https:" &&
      (hostname === "youtu.be" ||
        hostname === "youtube.com" ||
        hostname.endsWith(".youtube.com"))
    );
  } catch {
    return false;
  }
}

const mapUrl = z
  .string()
  .trim()
  .max(2000, "This link is too long")
  .refine(
    (value) => value === "" || isWebUrl(value),
    "Paste a full link, starting with https://",
  );

const livestreamUrl = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || isYouTubeUrl(value),
    "Use a YouTube link (youtube.com or youtu.be)",
  );

const fields = {
  name: required("the event's name", 80),
  startAt: instant("start date and time"),
  endAt: instant("end date and time"),
  /** Empty: no muhurtham. */
  muhurthamAt: z.union([z.literal(""), instant("muhurtham time")]),
  dressCode: optional(200),
  instructions: optional(2000),
  livestreamUrl,
};

const venue = {
  name: required("the venue's name", 200),
  address: required("the venue's address", 500),
  /** Empty: a Google Maps search for the venue (PRD). */
  mapUrl,
};

export const END_BEFORE_START = "The end must be after the start";
export const MUHURTHAM_OUTSIDE =
  "The muhurtham must be between the start and end";

/**
 * Database Design "Field rules": the end is after the start; the muhurtham,
 * when there is one, falls within the event (decision 70). Field names are
 * the API's, so they show beside the right inputs.
 */
export function timeProblems(times: {
  startAt: Date;
  endAt: Date;
  muhurthamAt?: Date | null;
}): Record<string, string> {
  const problems: Record<string, string> = {};
  if (times.endAt <= times.startAt) problems.endAt = END_BEFORE_START;
  const { muhurthamAt } = times;
  if (
    muhurthamAt &&
    (muhurthamAt < times.startAt || muhurthamAt > times.endAt)
  ) {
    problems.muhurthamAt = MUHURTHAM_OUTSIDE;
  }
  return problems;
}

/** POST /events (API Design "Events"; Admin). */
export const createEventSchema = z
  .object({
    ...fields,
    muhurthamAt: fields.muhurthamAt.optional(),
    dressCode: fields.dressCode.optional(),
    instructions: fields.instructions.optional(),
    livestreamUrl: fields.livestreamUrl.optional(),
    venue: z.object({ ...venue, mapUrl: venue.mapUrl.optional() }),
  })
  .superRefine((input, ctx) => {
    const problems = timeProblems({
      startAt: new Date(input.startAt),
      endAt: new Date(input.endAt),
      muhurthamAt: input.muhurthamAt ? new Date(input.muhurthamAt) : null,
    });
    for (const [field, message] of Object.entries(problems)) {
      ctx.addIssue({ code: "custom", path: [field], message });
    }
  });

/**
 * PATCH /events/{id} (Admin, Manager; the livestream link is Admin only):
 * any field, sent only when changed. Times are checked against the saved
 * ones in the service.
 */
export const updateEventSchema = z
  .object({
    ...fields,
    venue: z.object(venue).partial(),
  })
  .partial()
  .refine(
    (value) =>
      Object.entries(value).some(([key, v]) =>
        key === "venue"
          ? Object.values(v as object).some((field) => field !== undefined)
          : v !== undefined,
      ),
    { message: "Nothing to change" },
  );

export type CreateEventInput = z.output<typeof createEventSchema>;
export type UpdateEventInput = z.output<typeof updateEventSchema>;
