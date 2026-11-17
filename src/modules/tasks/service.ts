// Tasks business logic: creating, assigning, editing and deleting tasks, the
// computed "overdue", and the list's filters (PRD "Tasks", key flow F3; API
// Design "Tasks"). Notifying the assignee arrives with notifications
// (decision 71). Callers outside this module reach it only through index.ts.
import "server-only";

import type { ClientSession, QueryFilter } from "mongoose";

import { todayInKolkata } from "@/lib/format";
import { eventNamesOf, type EventLinks } from "@/modules/events";
import { organisersOf } from "@/modules/wedding";
import { connectDb } from "@/platform/db";
import { AppError } from "@/platform/errors";
import type { WeddingContext } from "@/platform/rbac";

import { type Priority, type Status, type TaskDoc, taskModels } from "./model";
import type {
  CreateTaskInput,
  TaskQuery,
  TaskSort,
  UpdateTaskInput,
} from "./schemas";

/** A task as the API returns it. Every task carries `overdue` (API Design). */
export interface TaskView {
  id: string;
  title: string;
  description: string | null;
  event: { id: string; name: string } | null;
  assignee: { id: string; name: string; relationLabel: string | null } | null;
  dueDate: string | null;
  priority: Priority;
  status: Status;
  overdue: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskPage {
  tasks: TaskView[];
  nextCursor: string | null;
  limit: number;
}

async function models() {
  return taskModels(await connectDb());
}

const notFound = () =>
  new AppError("NOT_FOUND", 404, "This task doesn't exist.");

const validationFailed = (fields: Record<string, string>) =>
  new AppError("VALIDATION_FAILED", 400, "Some fields are invalid.", {
    fields,
  });

function isObjectId(id: string): boolean {
  return /^[0-9a-f]{24}$/i.test(id);
}

/** PRD: overdue is calculated (due date passed, not Completed), never set. */
export function isOverdue(
  task: Pick<TaskDoc, "dueDate" | "status">,
  today: string,
): boolean {
  return Boolean(
    task.dueDate && task.dueDate < today && task.status !== "COMPLETED",
  );
}

/** The wedding's organisers and events, to check ids and show names. */
async function lookups(ctx: WeddingContext) {
  const [organisers, events] = await Promise.all([
    organisersOf(ctx),
    eventNamesOf(ctx),
  ]);
  return {
    organisers: new Map(organisers.map((person) => [person.id, person])),
    events: new Map(events.map((event) => [event.id, event])),
  };
}
type Lookups = Awaited<ReturnType<typeof lookups>>;

function toView(task: TaskDoc, found: Lookups, today: string): TaskView {
  return {
    id: task._id.toString(),
    title: task.title,
    description: task.description ?? null,
    event: (task.eventId && found.events.get(task.eventId.toString())) || null,
    assignee:
      (task.assigneeId && found.organisers.get(task.assigneeId.toString())) ||
      null,
    dueDate: task.dueDate ?? null,
    priority: task.priority,
    status: task.status,
    overdue: isOverdue(task, today),
    completedAt: task.completedAt?.toISOString() ?? null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

/**
 * The event and assignee must belong to this wedding (API Design: 400
 * VALIDATION_FAILED "assignee not a member, event not in this wedding").
 */
function checkLinks(
  input: { eventId?: string; assigneeId?: string },
  found: Lookups,
) {
  const problems: Record<string, string> = {};
  if (input.eventId && !found.events.has(input.eventId)) {
    problems.eventId = "Choose one of this wedding's events";
  }
  if (input.assigneeId && !found.organisers.has(input.assigneeId)) {
    problems.assigneeId = "Choose an Admin or Manager of this wedding";
  }
  if (Object.keys(problems).length > 0) throw validationFailed(problems);
}

// Sorting happens here, not in MongoDB: a wedding has hundreds of tasks, and
// the default order puts tasks without a due date last, which MongoDB's sort
// can't (decision 71). Each sort key ends with the id, so the order is total
// and the cursor is that key.
const PRIORITY_RANK: Record<Priority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
const NO_DUE_DATE = "9999-12-31";
type SortKey = (string | number)[];

function sortKey(task: TaskDoc, sort: TaskSort): SortKey {
  const id = task._id.toString();
  const due = task.dueDate ?? NO_DUE_DATE;
  if (sort === "-priority") return [PRIORITY_RANK[task.priority], due, id];
  if (sort === "-createdAt") return [-task.createdAt.getTime(), id];
  return [due, PRIORITY_RANK[task.priority], id];
}

function compareKeys(a: SortKey, b: SortKey): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i]!;
    const y = b[i]!;
    if (x < y) return -1;
    if (x > y) return 1;
  }
  return 0;
}

function encodeCursor(key: SortKey): string {
  return Buffer.from(JSON.stringify(key)).toString("base64url");
}

function decodeCursor(cursor: string): SortKey {
  try {
    const key: unknown = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    );
    if (
      Array.isArray(key) &&
      key.every((part) => typeof part === "string" || typeof part === "number")
    ) {
      return key;
    }
  } catch {
    // Falls through to the error below.
  }
  throw validationFailed({ cursor: "This page link isn't valid" });
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** A wedding never has more tasks than this in one list (decision 71). */
const MAX_TASKS = 2000;

/**
 * The task list with API Design's filters, sorts and cursor paging. Views:
 * all tasks, my tasks (`assigneeId=me`), by event (`eventId`).
 */
export async function listTasks(
  ctx: WeddingContext,
  query: TaskQuery,
  now = new Date(),
): Promise<TaskPage> {
  const today = todayInKolkata(now);
  const filter: QueryFilter<TaskDoc> = { weddingId: ctx.weddingId };
  if (query.eventId === "none") filter.eventId = { $exists: false };
  else if (query.eventId) filter.eventId = query.eventId;
  if (query.assigneeId === "none") filter.assigneeId = { $exists: false };
  else if (query.assigneeId === "me") filter.assigneeId = ctx.userId;
  else if (query.assigneeId) filter.assigneeId = query.assigneeId;
  if (query.status?.length) filter.status = { $in: query.status };
  if (query.priority) filter.priority = query.priority;
  if (query.overdue || query.dueBefore) {
    const before = [query.overdue && today, query.dueBefore]
      .filter((date): date is string => Boolean(date))
      .sort()[0]!;
    filter.dueDate = { $exists: true, $lt: before };
  }
  if (query.overdue) {
    filter.status = {
      $in: (query.status ?? ["TODO", "IN_PROGRESS"]).filter(
        (status) => status !== "COMPLETED",
      ),
    };
  }
  if (query.q) filter.title = { $regex: escapeRegExp(query.q), $options: "i" };

  const { Task } = await models();
  const [found, tasks] = await Promise.all([
    lookups(ctx),
    Task.find(filter).limit(MAX_TASKS),
  ]);

  const sorted = tasks
    .map((task) => ({ task, key: sortKey(task, query.sort) }))
    .sort((a, b) => compareKeys(a.key, b.key));
  const after = query.cursor ? decodeCursor(query.cursor) : null;
  const rest = after
    ? sorted.filter(({ key }) => compareKeys(key, after) > 0)
    : sorted;
  const page = rest.slice(0, query.limit);
  const last = page.at(-1);

  return {
    tasks: page.map(({ task }) => toView(task, found, today)),
    nextCursor:
      rest.length > query.limit && last ? encodeCursor(last.key) : null,
    limit: query.limit,
  };
}

async function findTask(ctx: WeddingContext, id: string) {
  if (!isObjectId(id)) throw notFound();
  const { Task } = await models();
  const task = await Task.findOne({ _id: id, weddingId: ctx.weddingId });
  if (!task) throw notFound();
  return task;
}

/** One task (API Design `GET /tasks/{id}`). */
export async function getTask(
  ctx: WeddingContext,
  id: string,
  now = new Date(),
): Promise<TaskView> {
  const [task, found] = await Promise.all([findTask(ctx, id), lookups(ctx)]);
  return toView(task, found, todayInKolkata(now));
}

/** Adds a task, To Do (PRD key flow F3, step 2; Admin, Manager). */
export async function createTask(
  ctx: WeddingContext,
  input: CreateTaskInput,
  now = new Date(),
): Promise<TaskView> {
  const found = await lookups(ctx);
  checkLinks(input, found);
  const { Task } = await models();
  const task = await Task.create({
    weddingId: ctx.weddingId,
    title: input.title,
    ...(input.description && { description: input.description }),
    ...(input.eventId && { eventId: input.eventId }),
    ...(input.assigneeId && { assigneeId: input.assigneeId }),
    ...(input.dueDate && { dueDate: input.dueDate }),
    priority: input.priority,
    status: "TODO",
    createdBy: ctx.userId,
    updatedBy: ctx.userId,
  });
  return toView(task, found, todayInKolkata(now));
}

/**
 * Edits, reassigns or moves a task (API Design `PATCH /tasks/{id}`). Only
 * the fields sent are written; "" clears an optional one. Completing a task
 * records when; moving it back clears that.
 */
export async function updateTask(
  ctx: WeddingContext,
  id: string,
  input: UpdateTaskInput,
  now = new Date(),
): Promise<TaskView> {
  const [current, found] = await Promise.all([findTask(ctx, id), lookups(ctx)]);
  checkLinks(input, found);

  const set: Record<string, unknown> = { updatedBy: ctx.userId };
  const unset: Record<string, ""> = {};
  if (input.title !== undefined) set.title = input.title;
  if (input.priority !== undefined) set.priority = input.priority;
  for (const field of [
    "description",
    "eventId",
    "assigneeId",
    "dueDate",
  ] as const) {
    const value = input[field];
    if (value === undefined) continue;
    if (value) set[field] = value;
    else unset[field] = "";
  }
  if (input.status !== undefined && input.status !== current.status) {
    set.status = input.status;
    if (input.status === "COMPLETED") set.completedAt = now;
    else unset.completedAt = "";
  }

  const { Task } = await models();
  const updated = await Task.findOneAndUpdate(
    { _id: current._id, weddingId: ctx.weddingId },
    { $set: set, ...(Object.keys(unset).length && { $unset: unset }) },
    { returnDocument: "after" },
  );
  if (!updated) throw notFound();
  return toView(updated, found, todayInKolkata(now));
}

/**
 * Deletes a task (Admin, Manager). Linked expenses keep their data (API
 * Design); expenses unset their `taskId` when they exist (decision 71).
 */
export async function deleteTask(
  ctx: WeddingContext,
  id: string,
): Promise<void> {
  const task = await findTask(ctx, id);
  const { Task } = await models();
  await Task.deleteOne({ _id: task._id, weddingId: ctx.weddingId });
}

/** What the dashboard shows of tasks (decision 73). */
export interface TaskOverview {
  /** Overdue tasks are also counted in todo or inProgress. */
  counts: {
    todo: number;
    inProgress: number;
    completed: number;
    overdue: number;
  };
  /** Open tasks assigned to the viewer: overdue first, then by due date. */
  mine: {
    id: string;
    title: string;
    dueDate: string | null;
    overdue: boolean;
    priority: Priority;
    eventName: string | null;
  }[];
}

/** The default list order's key (due date, priority, id) for any task shape. */
function dueKey(task: Pick<TaskDoc, "_id" | "dueDate" | "priority">): SortKey {
  return [
    task.dueDate ?? NO_DUE_DATE,
    PRIORITY_RANK[task.priority],
    task._id.toString(),
  ];
}

/**
 * Task progress for the countdown card and "My tasks" (PRD dashboard):
 * counts by status with overdue, and up to `limit` of the viewer's open
 * tasks, overdue first (API Design `GET /dashboard`).
 */
export async function taskOverview(
  ctx: WeddingContext,
  now = new Date(),
  limit = 10,
): Promise<TaskOverview> {
  const today = todayInKolkata(now);
  const { Task } = await models();
  const [tasks, events] = await Promise.all([
    Task.find(
      { weddingId: ctx.weddingId },
      {
        title: 1,
        status: 1,
        dueDate: 1,
        priority: 1,
        assigneeId: 1,
        eventId: 1,
      },
    ).limit(MAX_TASKS),
    eventNamesOf(ctx),
  ]);
  const eventName = new Map(events.map((event) => [event.id, event.name]));

  const counts = { todo: 0, inProgress: 0, completed: 0, overdue: 0 };
  for (const task of tasks) {
    if (task.status === "TODO") counts.todo++;
    else if (task.status === "IN_PROGRESS") counts.inProgress++;
    else counts.completed++;
    if (isOverdue(task, today)) counts.overdue++;
  }

  const mine = tasks
    .filter(
      (task) =>
        task.assigneeId?.toString() === ctx.userId &&
        task.status !== "COMPLETED",
    )
    .map((task) => ({ task, overdue: isOverdue(task, today) }))
    .sort(
      (a, b) =>
        Number(b.overdue) - Number(a.overdue) ||
        compareKeys(dueKey(a.task), dueKey(b.task)),
    )
    .slice(0, limit)
    .map(({ task, overdue }) => ({
      id: task._id.toString(),
      title: task.title,
      dueDate: task.dueDate ?? null,
      overdue,
      priority: task.priority,
      eventName:
        (task.eventId && eventName.get(task.eventId.toString())) || null,
    }));

  return { counts, mine };
}

/** The assignee picker: the wedding's Admins and Managers. */
export async function taskAssignees(ctx: WeddingContext) {
  return organisersOf(ctx);
}

/**
 * Removing a member unassigns their tasks, in the removal's transaction
 * (PRD: "their tasks become unassigned, not deleted").
 */
export async function unassignTasksOf(
  removed: { weddingId: string; userId: string },
  session: ClientSession,
): Promise<void> {
  const { Task } = await models();
  await Task.updateMany(
    { weddingId: removed.weddingId, assigneeId: removed.userId },
    { $unset: { assigneeId: "" } },
    { session },
  );
}

/**
 * Tasks' part in deleting an event (Database Design "What happens on
 * delete"): In Progress tasks block it; To Do and Completed tasks become
 * general tasks.
 */
export const taskEventLinks: EventLinks = {
  async check(ctx, eventId) {
    const { Task } = await models();
    const tasks = await Task.find(
      { weddingId: ctx.weddingId, eventId },
      { title: 1, status: 1 },
    );
    return {
      blockingTasks: tasks
        .filter((task) => task.status === "IN_PROGRESS")
        .map((task) => ({
          id: task._id.toString(),
          title: task.title,
          status: task.status,
        })),
      willUnlink: {
        tasks: tasks.filter((task) => task.status !== "IN_PROGRESS").length,
        paidExpenses: 0,
        photos: 0,
        guests: 0,
      },
    };
  },
  async unlink(ctx, eventId, session) {
    const { Task } = await models();
    await Task.updateMany(
      { weddingId: ctx.weddingId, eventId },
      { $unset: { eventId: "" } },
      { session },
    );
  },
};
