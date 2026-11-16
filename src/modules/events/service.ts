// Events business logic: the schedule, creating, editing and deleting events
// (PRD "Events", key flow F3; API Design "Events"). The QR code, WhatsApp
// share, cover image and the photographer's delivery link arrive with the
// features that use them (decision 70). Callers outside this module reach it
// only through index.ts.
import "server-only";

import { randomBytes } from "node:crypto";

import { connectDb } from "@/platform/db";
import { AppError } from "@/platform/errors";
import { getPublicEnv } from "@/platform/public-env";
import type { WeddingContext } from "@/platform/rbac";

import { type EventDoc, eventModels } from "./model";
import { eventsPolicy } from "./policy";
import {
  type CreateEventInput,
  timeProblems,
  type UpdateEventInput,
} from "./schemas";

/** An event as the API returns it. */
export interface EventView {
  id: string;
  name: string;
  /** ISO instants (UTC); shown in Asia/Kolkata. */
  startAt: string;
  endAt: string;
  muhurthamAt: string | null;
  venue: {
    name: string;
    address: string;
    /** The organiser's link, or a Google Maps search for the venue. */
    mapUrl: string;
    /** True when an organiser gave the link; false when it is the search. */
    mapUrlCustom: boolean;
  };
  dressCode: string | null;
  instructions: string | null;
  livestreamUrl: string | null;
  /** The QR upload page (API Design); Admins only, as it lets anyone upload. */
  uploadUrl?: string;
}

/** What deleting an event would change or what blocks it (API Design). */
export interface DeleteCheck {
  blocked: boolean;
  blockingTasks: { id: string; title: string; status: string }[];
  blockingExpenses: { id: string; description: string; amountPaise: number }[];
  willUnlink: {
    tasks: number;
    paidExpenses: number;
    photos: number;
    guests: number;
  };
}

async function models() {
  return eventModels(await connectDb());
}

const notFound = () =>
  new AppError("NOT_FOUND", 404, "This event doesn't exist.");

function isObjectId(id: string): boolean {
  return /^[0-9a-f]{24}$/i.test(id);
}

/** PRD: "Map link — auto-generated from address if left empty". */
export function googleMapsSearch(venue: { name: string; address: string }) {
  const query = encodeURIComponent(`${venue.name}, ${venue.address}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

function toView(event: EventDoc, ctx: WeddingContext): EventView {
  return {
    id: event._id.toString(),
    name: event.name,
    startAt: event.startAt.toISOString(),
    endAt: event.endAt.toISOString(),
    muhurthamAt: event.muhurthamAt?.toISOString() ?? null,
    venue: {
      name: event.venue.name,
      address: event.venue.address,
      mapUrl: event.venue.mapUrl ?? googleMapsSearch(event.venue),
      mapUrlCustom: Boolean(event.venue.mapUrl),
    },
    dressCode: event.dressCode ?? null,
    instructions: event.instructions ?? null,
    livestreamUrl: event.livestreamUrl ?? null,
    ...(ctx.role === "ADMIN" && {
      uploadUrl: `${getPublicEnv().appUrl}/u/${event.uploadToken}`,
    }),
  };
}

const validationFailed = (fields: Record<string, string>) =>
  new AppError("VALIDATION_FAILED", 400, "Some fields are invalid.", {
    fields,
  });

/** The schedule: every event, earliest first (API Design `GET /events`). */
export async function listEvents(ctx: WeddingContext): Promise<EventView[]> {
  const { Event } = await models();
  const events = await Event.find({ weddingId: ctx.weddingId }).sort({
    startAt: 1,
    sortOrder: 1,
    _id: 1,
  });
  return events.map((event) => toView(event, ctx));
}

async function findEvent(ctx: WeddingContext, id: string) {
  if (!isObjectId(id)) throw notFound();
  const { Event } = await models();
  const event = await Event.findOne({ _id: id, weddingId: ctx.weddingId });
  if (!event) throw notFound();
  return event;
}

/** One event (API Design `GET /events/{id}`). */
export async function getEvent(
  ctx: WeddingContext,
  id: string,
): Promise<EventView> {
  return toView(await findEvent(ctx, id), ctx);
}

/** Adds an event to the schedule (PRD F3, step 1; Admin). */
export async function createEvent(
  ctx: WeddingContext,
  input: CreateEventInput,
): Promise<EventView> {
  const { Event } = await models();
  // Events starting at the same moment keep the order they were added in.
  const sortOrder = await Event.countDocuments({ weddingId: ctx.weddingId });
  const event = await Event.create({
    weddingId: ctx.weddingId,
    name: input.name,
    startAt: new Date(input.startAt),
    endAt: new Date(input.endAt),
    ...(input.muhurthamAt && { muhurthamAt: new Date(input.muhurthamAt) }),
    venue: {
      name: input.venue.name,
      address: input.venue.address,
      ...(input.venue.mapUrl && { mapUrl: input.venue.mapUrl }),
    },
    ...(input.dressCode && { dressCode: input.dressCode }),
    ...(input.instructions && { instructions: input.instructions }),
    ...(input.livestreamUrl && { livestreamUrl: input.livestreamUrl }),
    uploadToken: randomBytes(24).toString("base64url"),
    sortOrder,
    createdBy: ctx.userId,
    updatedBy: ctx.userId,
  });
  return toView(event, ctx);
}

/**
 * Saves the fields that changed (API Design `PATCH /events/{id}`; Admins and
 * Managers, the livestream link Admins only). Only the fields sent are
 * written, so two people editing different fields don't undo each other.
 */
export async function updateEvent(
  ctx: WeddingContext,
  id: string,
  input: UpdateEventInput,
): Promise<EventView> {
  const livestreamRoles: readonly string[] = eventsPolicy["events.livestream"];
  if (
    input.livestreamUrl !== undefined &&
    !livestreamRoles.includes(ctx.role)
  ) {
    throw new AppError(
      "FORBIDDEN",
      403,
      "Only an Admin can set the livestream link.",
    );
  }
  const current = await findEvent(ctx, id);

  const muhurthamAt =
    input.muhurthamAt === undefined
      ? current.muhurthamAt
      : input.muhurthamAt
        ? new Date(input.muhurthamAt)
        : null;
  const problems = timeProblems({
    startAt: input.startAt ? new Date(input.startAt) : current.startAt,
    endAt: input.endAt ? new Date(input.endAt) : current.endAt,
    muhurthamAt,
  });
  if (Object.keys(problems).length > 0) throw validationFailed(problems);

  const set: Record<string, unknown> = { updatedBy: ctx.userId };
  const unset: Record<string, ""> = {};
  if (input.name !== undefined) set.name = input.name;
  if (input.startAt !== undefined) set.startAt = new Date(input.startAt);
  if (input.endAt !== undefined) set.endAt = new Date(input.endAt);
  if (input.muhurthamAt !== undefined) {
    if (muhurthamAt) set.muhurthamAt = muhurthamAt;
    else unset.muhurthamAt = "";
  }
  if (input.venue?.name !== undefined) set["venue.name"] = input.venue.name;
  if (input.venue?.address !== undefined) {
    set["venue.address"] = input.venue.address;
  }
  // Optional text: an empty string clears it.
  const optional = [
    ["venue.mapUrl", input.venue?.mapUrl],
    ["dressCode", input.dressCode],
    ["instructions", input.instructions],
    ["livestreamUrl", input.livestreamUrl],
  ] as const;
  for (const [path, value] of optional) {
    if (value === undefined) continue;
    if (value) set[path] = value;
    else unset[path] = "";
  }

  const { Event } = await models();
  const updated = await Event.findOneAndUpdate(
    { _id: current._id, weddingId: ctx.weddingId },
    { $set: set, ...(Object.keys(unset).length && { $unset: unset }) },
    { returnDocument: "after" },
  );
  if (!updated) throw notFound();
  return toView(updated, ctx);
}

/**
 * What deleting this event would change, or what blocks it (API Design
 * `GET /events/{id}/delete-check`). Tasks, expenses, photos and guests don't
 * exist yet, so nothing blocks a delete and nothing is unlinked; each of
 * those features adds its part here (decision 70).
 */
export async function checkEventDelete(
  ctx: WeddingContext,
  id: string,
): Promise<DeleteCheck> {
  await findEvent(ctx, id);
  return {
    blocked: false,
    blockingTasks: [],
    blockingExpenses: [],
    willUnlink: { tasks: 0, paidExpenses: 0, photos: 0, guests: 0 },
  };
}

/** Deletes an event (Admin), unless something blocks it (409). */
export async function deleteEvent(
  ctx: WeddingContext,
  id: string,
): Promise<void> {
  const check = await checkEventDelete(ctx, id);
  if (check.blocked) {
    throw new AppError(
      "EVENT_HAS_ACTIVE_ITEMS",
      409,
      "Finish or move this event's active tasks and pending payments first.",
      {
        tasks: check.blockingTasks,
        expenses: check.blockingExpenses,
      },
    );
  }
  const { Event } = await models();
  const { deletedCount } = await Event.deleteOne({
    _id: id,
    weddingId: ctx.weddingId,
  });
  if (deletedCount === 0) throw notFound();
}
