// Activity business logic: the append-only log of every change, and reading
// it by person, area and date (PRD "Notifications, activity log and
// exports"; API Design `GET /activity`; Database Design "activityLog").
// Other modules call `recordActivity` after a change succeeds (decision 77).
// Callers outside this module reach it only through index.ts.
import "server-only";

import type { QueryFilter } from "mongoose";

import { findUsersByIds } from "@/modules/auth";
import { connectDb } from "@/platform/db";
import { AppError } from "@/platform/errors";

import {
  type Action,
  type ActivityDoc,
  activityModels,
  type EntityType,
} from "./model";
import type { ActivityQuery } from "./schemas";

/** Who did it and where: a member acting in their wedding. */
export interface Actor {
  userId: string;
  weddingId: string;
}

export interface ActivityChange {
  field: string;
  from?: unknown;
  to?: unknown;
}

/** One entry as the API returns it. */
export interface ActivityView {
  id: string;
  actor: { kind: "USER" | "GUEST" | "SYSTEM"; id: string | null; name: string };
  action: Action;
  entity: { type: EntityType; id: string; label: string };
  summary: string;
  changes: ActivityChange[];
  /** ISO instant. */
  at: string;
}

export interface ActivityPage {
  entries: ActivityView[];
  nextCursor: string | null;
  limit: number;
}

async function models() {
  return activityModels(await connectDb());
}

/** "Book the DJ" → "'Book the DJ'", shortened when very long. */
export function quoted(label: string): string {
  const short = label.length > 60 ? `${label.slice(0, 57)}…` : label;
  return `'${short}'`;
}

/**
 * Records a change (PRD: "every create, edit and delete … is logged with
 * who, what, when and a one-line summary"). `did` is the summary after the
 * person's name: "added the event 'Sangeet'". It never throws: a change that
 * succeeded stays succeeded if the log can't be written (decision 77).
 */
export async function recordActivity(
  actor: Actor,
  entry: {
    action: Action;
    entity: { type: EntityType; id: string; label: string };
    did: string;
    changes?: ActivityChange[];
  },
): Promise<void> {
  try {
    const [user] = await findUsersByIds([actor.userId]);
    const name = user?.name ?? "Someone";
    const { Activity } = await models();
    await Activity.create({
      weddingId: actor.weddingId,
      actor: { kind: "USER", ...(user && { id: actor.userId }), name },
      action: entry.action,
      entity: entry.entity,
      summary: `${name} ${entry.did}`.slice(0, 400),
      ...(entry.changes?.length && { changes: entry.changes }),
    });
  } catch (err) {
    console.error("Couldn't record activity:", err);
  }
}

function toView(doc: ActivityDoc): ActivityView {
  return {
    id: doc._id.toString(),
    actor: {
      kind: doc.actor.kind,
      id: doc.actor.id?.toString() ?? null,
      name: doc.actor.name,
    },
    action: doc.action,
    entity: {
      type: doc.entity.type,
      id: doc.entity.id.toString(),
      label: doc.entity.label,
    },
    summary: doc.summary,
    // Plain values, not Mongoose subdocuments.
    changes: (doc.changes ?? []).map((change) => ({
      field: change.field,
      ...(change.from !== undefined && { from: change.from }),
      ...(change.to !== undefined && { to: change.to }),
    })),
    at: doc.createdAt.toISOString(),
  };
}

/** The start of a calendar day in India, as an instant. */
function kolkataDayStart(date: string): Date {
  return new Date(`${date}T00:00:00+05:30`);
}

/**
 * The activity log, newest first, with API Design's filters (`actorId`,
 * `entityType`, `from`, `to`) and cursor paging by entry id.
 */
export async function listActivity(
  actor: Actor,
  query: ActivityQuery,
): Promise<ActivityPage> {
  const filter: QueryFilter<ActivityDoc> = { weddingId: actor.weddingId };
  if (query.actorId) filter["actor.id"] = query.actorId;
  if (query.entityType) filter["entity.type"] = query.entityType;
  if (query.from || query.to) {
    if (query.from && query.to && query.from > query.to) {
      throw new AppError(
        "VALIDATION_FAILED",
        400,
        "Some filters are invalid.",
        {
          fields: { to: "Choose a date after the start" },
        },
      );
    }
    filter.createdAt = {
      ...(query.from && { $gte: kolkataDayStart(query.from) }),
      // `to` includes that whole day.
      ...(query.to && {
        $lt: new Date(kolkataDayStart(query.to).getTime() + 86_400_000),
      }),
    };
  }
  if (query.cursor) filter._id = { $lt: query.cursor };

  const { Activity } = await models();
  const docs = await Activity.find(filter)
    .sort({ _id: -1 })
    .limit(query.limit + 1);
  const page = docs.slice(0, query.limit);
  return {
    entries: page.map(toView),
    nextCursor: docs.length > query.limit ? page.at(-1)!._id.toString() : null,
    limit: query.limit,
  };
}

/** The dashboard's Recent activity: the last `limit` entries (PRD: 10). */
export async function recentActivity(
  actor: Actor,
  limit = 10,
): Promise<ActivityView[]> {
  const { Activity } = await models();
  const docs = await Activity.find({ weddingId: actor.weddingId })
    .sort({ _id: -1 })
    .limit(limit);
  return docs.map(toView);
}

/** The people who appear in the log, for the "person" filter. */
export async function activityPeople(
  actor: Actor,
): Promise<{ id: string; name: string }[]> {
  const { Activity } = await models();
  const ids: unknown[] = await Activity.distinct("actor.id", {
    weddingId: actor.weddingId,
  });
  const users = await findUsersByIds(ids.map(String));
  return users
    .map((user) => ({ id: user.id, name: user.name }))
    .sort((a, b) => a.name.localeCompare(b.name, "en-IN"));
}

/**
 * What changed between the saved values and the sent ones, for UPDATE
 * entries. Fields in `hide` are named but their values aren't kept (long
 * text, links).
 */
export function changesOf(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  hide: readonly string[] = [],
): ActivityChange[] {
  const changes: ActivityChange[] = [];
  for (const [field, to] of Object.entries(after)) {
    if (to === undefined) continue;
    const from = before[field] ?? null;
    const next = to === "" ? null : to;
    if (String(from) === String(next)) continue;
    changes.push(hide.includes(field) ? { field } : { field, from, to: next });
  }
  return changes;
}
