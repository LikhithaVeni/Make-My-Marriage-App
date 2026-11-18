// Events business logic: the schedule, creating, editing and deleting events
// (PRD "Events", key flow F3; API Design "Events"). The QR code, WhatsApp
// share, cover image and the photographer's delivery link arrive with the
// features that use them (decision 70). Callers outside this module reach it
// only through index.ts.
import "server-only";

import { randomBytes } from "node:crypto";

import type { ClientSession } from "mongoose";

import { googleMapsSearch } from "@/lib/maps";
import { changesOf, quoted, recordActivity } from "@/modules/activity";
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

/** What the dashboard shows of events (decision 73). */
export interface EventOverview {
  count: number;
  /** The next few events not yet over, soonest first. */
  upcoming: {
    id: string;
    name: string;
    startAt: string;
    endAt: string;
    venueName: string;
    dressCode: string | null;
  }[];
}

/**
 * The number of events and the next `limit` that haven't ended (PRD
 * dashboard "Upcoming events": next 3 with date, time and venue). An event
 * already under way still shows until it ends.
 */
export async function eventOverview(
  ctx: WeddingContext,
  now = new Date(),
  limit = 3,
): Promise<EventOverview> {
  const { Event } = await models();
  const [count, upcoming] = await Promise.all([
    Event.countDocuments({ weddingId: ctx.weddingId }),
    Event.find({ weddingId: ctx.weddingId, endAt: { $gt: now } })
      .sort({ startAt: 1, sortOrder: 1, _id: 1 })
      .limit(limit),
  ]);
  return {
    count,
    upcoming: upcoming.map((event) => ({
      id: event._id.toString(),
      name: event.name,
      startAt: event.startAt.toISOString(),
      endAt: event.endAt.toISOString(),
      venueName: event.venue.name,
      dressCode: event.dressCode ?? null,
    })),
  };
}

/** Every event's id and name, for tasks to check and show (decision 71). */
export async function eventNamesOf(
  ctx: WeddingContext,
): Promise<{ id: string; name: string }[]> {
  const { Event } = await models();
  const events = await Event.find(
    { weddingId: ctx.weddingId },
    { name: 1 },
  ).sort({ startAt: 1, sortOrder: 1, _id: 1 });
  return events.map((event) => ({
    id: event._id.toString(),
    name: event.name,
  }));
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
  await recordActivity(ctx, {
    action: "CREATE",
    entity: { type: "EVENT", id: event._id.toString(), label: event.name },
    did: `added the event ${quoted(event.name)}`,
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
  const changes = changesOf(
    {
      name: current.name,
      startAt: current.startAt.toISOString(),
      endAt: current.endAt.toISOString(),
      muhurthamAt: current.muhurthamAt?.toISOString(),
      venueName: current.venue.name,
      venueAddress: current.venue.address,
      mapUrl: current.venue.mapUrl,
      dressCode: current.dressCode,
      instructions: current.instructions,
      livestreamUrl: current.livestreamUrl,
    },
    {
      name: input.name,
      startAt: input.startAt && new Date(input.startAt).toISOString(),
      endAt: input.endAt && new Date(input.endAt).toISOString(),
      muhurthamAt:
        input.muhurthamAt === undefined
          ? undefined
          : input.muhurthamAt && new Date(input.muhurthamAt).toISOString(),
      venueName: input.venue?.name,
      venueAddress: input.venue?.address,
      mapUrl: input.venue?.mapUrl,
      dressCode: input.dressCode,
      instructions: input.instructions,
      livestreamUrl: input.livestreamUrl,
    },
    ["instructions", "mapUrl", "livestreamUrl", "venueAddress"],
  );
  if (changes.length > 0) {
    await recordActivity(ctx, {
      action: "UPDATE",
      entity: {
        type: "EVENT",
        id: updated._id.toString(),
        label: updated.name,
      },
      did: `edited ${quoted(updated.name)} (${describeFields(changes)})`,
      changes,
    });
  }
  return toView(updated, ctx);
}

/**
 * How a module whose records point at events takes part in deleting one
 * (Database Design "What happens on delete"): it reports what blocks the
 * delete and what it would unlink, and unlinks inside the delete's
 * transaction. Route handlers pass them in, so events doesn't import those
 * modules (decision 71).
 */
export interface EventLinks {
  check(
    ctx: WeddingContext,
    eventId: string,
  ): Promise<Partial<Omit<DeleteCheck, "blocked">>>;
  unlink(
    ctx: WeddingContext,
    eventId: string,
    session: ClientSession,
  ): Promise<void>;
}

async function combinedCheck(
  ctx: WeddingContext,
  eventId: string,
  links: EventLinks[],
): Promise<DeleteCheck> {
  const check: DeleteCheck = {
    blocked: false,
    blockingTasks: [],
    blockingExpenses: [],
    willUnlink: { tasks: 0, paidExpenses: 0, photos: 0, guests: 0 },
  };
  for (const part of await Promise.all(
    links.map((link) => link.check(ctx, eventId)),
  )) {
    check.blockingTasks.push(...(part.blockingTasks ?? []));
    check.blockingExpenses.push(...(part.blockingExpenses ?? []));
    for (const key of Object.keys(
      check.willUnlink,
    ) as (keyof DeleteCheck["willUnlink"])[]) {
      check.willUnlink[key] += part.willUnlink?.[key] ?? 0;
    }
  }
  check.blocked =
    check.blockingTasks.length > 0 || check.blockingExpenses.length > 0;
  return check;
}

/**
 * What deleting this event would change, or what blocks it (API Design
 * `GET /events/{id}/delete-check`): In Progress tasks block it; To Do and
 * Completed tasks become general tasks. Expenses, photos and guests add
 * their parts when they exist (decision 70).
 */
export async function checkEventDelete(
  ctx: WeddingContext,
  id: string,
  links: EventLinks[] = [],
): Promise<DeleteCheck> {
  await findEvent(ctx, id);
  return combinedCheck(ctx, id, links);
}

const blockedError = (check: DeleteCheck) =>
  new AppError(
    "EVENT_HAS_ACTIVE_ITEMS",
    409,
    "Finish or move this event's active tasks and pending payments first.",
    { tasks: check.blockingTasks, expenses: check.blockingExpenses },
  );

/**
 * Deletes an event (Admin). The check runs again inside the transaction, so
 * a task started meanwhile still blocks it (API Design), and linked records
 * are unlinked in the same transaction.
 */
export async function deleteEvent(
  ctx: WeddingContext,
  id: string,
  links: EventLinks[] = [],
): Promise<void> {
  const event = await findEvent(ctx, id);
  const mongoose = await connectDb();
  const { Event } = eventModels(mongoose);
  const transaction = await mongoose.startSession();
  try {
    await transaction.withTransaction(async () => {
      const check = await combinedCheck(ctx, id, links);
      if (check.blocked) throw blockedError(check);
      for (const link of links) await link.unlink(ctx, id, transaction);
      const { deletedCount } = await Event.deleteOne(
        { _id: event._id, weddingId: ctx.weddingId },
        { session: transaction },
      );
      if (deletedCount === 0) throw notFound();
    });
  } finally {
    await transaction.endSession();
  }
  await recordActivity(ctx, {
    action: "DELETE",
    entity: { type: "EVENT", id: event._id.toString(), label: event.name },
    did: `deleted the event ${quoted(event.name)}`,
  });
}

const FIELD_NAMES: Record<string, string> = {
  name: "name",
  startAt: "start",
  endAt: "end",
  muhurthamAt: "muhurtham",
  venueName: "venue",
  venueAddress: "address",
  mapUrl: "map link",
  dressCode: "dress code",
  instructions: "instructions",
  livestreamUrl: "livestream",
};

/** "start, venue" for an activity summary. */
function describeFields(changes: { field: string }[]): string {
  return [...new Set(changes.map((c) => FIELD_NAMES[c.field] ?? c.field))].join(
    ", ",
  );
}
