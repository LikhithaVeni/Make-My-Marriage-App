// Expenses business logic: recording what was spent or is still due, marking
// payments Paid, and the totals by event, category and status (PRD "Expenses
// and vendors", key flow F4; API Design "Expenses"). Vendors and receipts
// arrive later (decision 74). Callers outside this module reach it only
// through index.ts.
import "server-only";

import type { ClientSession, QueryFilter } from "mongoose";

import { CATEGORY_LABELS } from "@/lib/expense-labels";
import { todayInKolkata } from "@/lib/format";
import { eventNamesOf, type EventLinks } from "@/modules/events";
import { taskTitlesOf } from "@/modules/tasks";
import { connectDb } from "@/platform/db";
import { AppError } from "@/platform/errors";
import type { WeddingContext } from "@/platform/rbac";

import {
  type Category,
  CATEGORIES,
  type ExpenseDoc,
  expenseModels,
  type ExpenseStatus,
} from "./model";
import {
  type CreateExpenseInput,
  DUE_DATE_NEEDED,
  type ExpenseQuery,
  type ExpenseSort,
  type UpdateExpenseInput,
} from "./schemas";

/** An expense as the API returns it. */
export interface ExpenseView {
  id: string;
  amountPaise: number;
  date: string;
  /** Null once its event was deleted: shown under "No event". */
  event: { id: string; name: string } | null;
  task: { id: string; title: string } | null;
  /** Arrives with Vendors (decision 74). */
  vendor: { id: string; name: string } | null;
  category: Category;
  description: string | null;
  paidBy: string;
  status: ExpenseStatus;
  dueDate: string | null;
  /** Pending and its due date has passed (India time). */
  overdue: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExpensePage {
  expenses: ExpenseView[];
  nextCursor: string | null;
  limit: number;
}

/** GET /expenses/summary (API Design), plus what the screens show. */
export interface ExpenseSummary {
  /** Everything recorded, Paid and Pending. */
  totalPaise: number;
  /** "Spent" (decision 39). */
  paidPaise: number;
  pendingPaise: number;
  /** The Pending expense due soonest. */
  nextDue: { id: string; description: string; dueDate: string } | null;
  /** Up to 3 Pending expenses, nearest due first (dashboard). */
  pendingPayments: {
    id: string;
    description: string;
    vendorName: string | null;
    amountPaise: number;
    dueDate: string;
  }[];
  /** Per event; `eventId` null is "No event". Largest first. */
  byEvent: {
    eventId: string | null;
    name: string;
    totalPaise: number;
    paidPaise: number;
  }[];
  /** Per category, largest first. */
  byCategory: { category: Category; totalPaise: number; paidPaise: number }[];
  count: number;
}

async function models() {
  return expenseModels(await connectDb());
}

const notFound = () =>
  new AppError("NOT_FOUND", 404, "This expense doesn't exist.");

const validationFailed = (fields: Record<string, string>) =>
  new AppError("VALIDATION_FAILED", 400, "Some fields are invalid.", {
    fields,
  });

function isObjectId(id: string): boolean {
  return /^[0-9a-f]{24}$/i.test(id);
}

/** A short name for an expense with no description: "Decor · Sangeet". */
function labelOf(
  expense: Pick<ExpenseDoc, "description" | "category">,
  eventName?: string,
): string {
  return (
    expense.description ??
    [CATEGORY_LABELS[expense.category], eventName].filter(Boolean).join(" · ")
  );
}

/** The wedding's events and tasks, to check ids and show names. */
async function lookups(ctx: WeddingContext) {
  const [events, tasks] = await Promise.all([
    eventNamesOf(ctx),
    taskTitlesOf(ctx),
  ]);
  return {
    events: new Map(events.map((event) => [event.id, event])),
    tasks: new Map(tasks.map((task) => [task.id, task])),
  };
}
type Lookups = Awaited<ReturnType<typeof lookups>>;

function toView(
  expense: ExpenseDoc,
  found: Lookups,
  today: string,
): ExpenseView {
  const event = expense.eventId && found.events.get(expense.eventId.toString());
  const task = expense.taskId && found.tasks.get(expense.taskId.toString());
  return {
    id: expense._id.toString(),
    amountPaise: expense.amountPaise,
    date: expense.date,
    event: event || null,
    task: task ? { id: task.id, title: task.title } : null,
    vendor: null,
    category: expense.category,
    description: expense.description ?? null,
    paidBy: expense.paidBy,
    status: expense.status,
    dueDate: expense.dueDate ?? null,
    overdue: Boolean(
      expense.status === "PENDING" &&
      expense.dueDate &&
      expense.dueDate < today,
    ),
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
  };
}

/**
 * The event and task must belong to this wedding (Database Design "Field
 * rules"; API Design: 400 when they're not).
 */
function checkLinks(
  input: { eventId?: string; taskId?: string },
  found: Lookups,
) {
  const problems: Record<string, string> = {};
  if (input.eventId && !found.events.has(input.eventId)) {
    problems.eventId = "Choose one of this wedding's events";
  }
  if (input.taskId && !found.tasks.has(input.taskId)) {
    problems.taskId = "Choose one of this wedding's tasks";
  }
  if (Object.keys(problems).length > 0) throw validationFailed(problems);
}

// Sorting and paging work as for tasks (decision 71): a wedding has a few
// hundred expenses, so the filtered ones are sorted here and paged with a
// cursor of the last item's sort key and id.
type SortKey = (string | number)[];
const NO_DUE_DATE = "9999-12-31";

function sortKey(expense: ExpenseDoc, sort: ExpenseSort): SortKey {
  const id = expense._id.toString();
  if (sort === "dueDate")
    return [expense.dueDate ?? NO_DUE_DATE, expense.date, id];
  if (sort === "-amountPaise") return [-expense.amountPaise, id];
  // Newest first; the same day, the most recently added first.
  return [
    -Number(expense.date.replaceAll("-", "")),
    -expense.createdAt.getTime(),
    id,
  ];
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

function decodeCursor(cursor: string): SortKey {
  try {
    const key: unknown = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    );
    if (
      Array.isArray(key) &&
      key.length > 0 &&
      key.every((part) => typeof part === "string" || typeof part === "number")
    ) {
      return key;
    }
  } catch {
    // Falls through.
  }
  throw validationFailed({ cursor: "This page link isn't valid" });
}

/** A wedding never has more expenses than this in one list (decision 74). */
const MAX_EXPENSES = 3000;

/** The expense list with API Design's filters, sorts and cursor paging. */
export async function listExpenses(
  ctx: WeddingContext,
  query: ExpenseQuery,
  now = new Date(),
): Promise<ExpensePage> {
  const filter: QueryFilter<ExpenseDoc> = { weddingId: ctx.weddingId };
  if (query.eventId === "none") filter.eventId = { $exists: false };
  else if (query.eventId) filter.eventId = query.eventId;
  if (query.taskId) filter.taskId = query.taskId;
  if (query.category) filter.category = query.category;
  if (query.status) filter.status = query.status;
  if (query.from || query.to) {
    filter.date = {
      ...(query.from && { $gte: query.from }),
      ...(query.to && { $lte: query.to }),
    };
  }
  if (query.dueBefore) filter.dueDate = { $exists: true, $lt: query.dueBefore };

  const { Expense } = await models();
  const [found, expenses] = await Promise.all([
    lookups(ctx),
    Expense.find(filter).limit(MAX_EXPENSES),
  ]);
  const sorted = expenses
    .map((expense) => ({ expense, key: sortKey(expense, query.sort) }))
    .sort((a, b) => compareKeys(a.key, b.key));
  const after = query.cursor ? decodeCursor(query.cursor) : null;
  const rest = after
    ? sorted.filter(({ key }) => compareKeys(key, after) > 0)
    : sorted;
  const page = rest.slice(0, query.limit);
  const last = page.at(-1);
  const today = todayInKolkata(now);

  return {
    expenses: page.map(({ expense }) => toView(expense, found, today)),
    nextCursor:
      rest.length > query.limit && last
        ? Buffer.from(JSON.stringify(last.key)).toString("base64url")
        : null,
    limit: query.limit,
  };
}

async function findExpense(ctx: WeddingContext, id: string) {
  if (!isObjectId(id)) throw notFound();
  const { Expense } = await models();
  const expense = await Expense.findOne({ _id: id, weddingId: ctx.weddingId });
  if (!expense) throw notFound();
  return expense;
}

/** One expense (API Design `GET /expenses/{id}`). */
export async function getExpense(
  ctx: WeddingContext,
  id: string,
  now = new Date(),
): Promise<ExpenseView> {
  const [expense, found] = await Promise.all([
    findExpense(ctx, id),
    lookups(ctx),
  ]);
  return toView(expense, found, todayInKolkata(now));
}

/** Records an expense (PRD key flow F4; Admin, Manager). */
export async function createExpense(
  ctx: WeddingContext,
  input: CreateExpenseInput,
  now = new Date(),
): Promise<ExpenseView> {
  const found = await lookups(ctx);
  checkLinks(input, found);
  const { Expense } = await models();
  const expense = await Expense.create({
    weddingId: ctx.weddingId,
    amountPaise: input.amountPaise,
    date: input.date,
    eventId: input.eventId,
    ...(input.taskId && { taskId: input.taskId }),
    category: input.category,
    ...(input.description && { description: input.description }),
    paidBy: input.paidBy,
    status: input.status,
    ...(input.dueDate && { dueDate: input.dueDate }),
    createdBy: ctx.userId,
    updatedBy: ctx.userId,
  });
  return toView(expense, found, todayInKolkata(now));
}

/**
 * Edits an expense or marks it Paid (API Design `PATCH /expenses/{id}`).
 * Only the fields sent are written; "" clears an optional one. A Pending
 * expense must keep a due date.
 */
export async function updateExpense(
  ctx: WeddingContext,
  id: string,
  input: UpdateExpenseInput,
  now = new Date(),
): Promise<ExpenseView> {
  const [current, found] = await Promise.all([
    findExpense(ctx, id),
    lookups(ctx),
  ]);
  checkLinks(input, found);
  const status = input.status ?? current.status;
  const dueDate =
    input.dueDate === undefined ? current.dueDate : input.dueDate || undefined;
  if (status === "PENDING" && !dueDate) {
    throw validationFailed({ dueDate: DUE_DATE_NEEDED });
  }

  const set: Record<string, unknown> = { updatedBy: ctx.userId };
  const unset: Record<string, ""> = {};
  for (const field of [
    "amountPaise",
    "date",
    "eventId",
    "category",
    "paidBy",
    "status",
  ] as const) {
    if (input[field] !== undefined) set[field] = input[field];
  }
  for (const field of ["taskId", "description", "dueDate"] as const) {
    const value = input[field];
    if (value === undefined) continue;
    if (value) set[field] = value;
    else unset[field] = "";
  }

  const { Expense } = await models();
  const updated = await Expense.findOneAndUpdate(
    { _id: current._id, weddingId: ctx.weddingId },
    { $set: set, ...(Object.keys(unset).length && { $unset: unset }) },
    { returnDocument: "after" },
  );
  if (!updated) throw notFound();
  return toView(updated, found, todayInKolkata(now));
}

/**
 * Deletes an expense (Admin, Manager). Its receipt will be queued for purge
 * once receipts exist (API Design; decision 74).
 */
export async function deleteExpense(
  ctx: WeddingContext,
  id: string,
): Promise<void> {
  const expense = await findExpense(ctx, id);
  const { Expense } = await models();
  await Expense.deleteOne({ _id: expense._id, weddingId: ctx.weddingId });
}

/**
 * Totals for the Expenses page and the dashboard (API Design
 * `GET /expenses/summary`; PRD: overall spent, per event, per category,
 * pending). "Spent" is what's Paid (decision 39).
 */
export async function expenseSummary(
  ctx: WeddingContext,
): Promise<ExpenseSummary> {
  const { Expense } = await models();
  const [expenses, events] = await Promise.all([
    Expense.find(
      { weddingId: ctx.weddingId },
      {
        amountPaise: 1,
        status: 1,
        dueDate: 1,
        eventId: 1,
        category: 1,
        description: 1,
        date: 1,
      },
    ).limit(MAX_EXPENSES),
    eventNamesOf(ctx),
  ]);
  const eventName = new Map(events.map((event) => [event.id, event.name]));

  let paidPaise = 0;
  let pendingPaise = 0;
  const byEvent = new Map<string, ExpenseSummary["byEvent"][number]>();
  const byCategory = new Map<Category, ExpenseSummary["byCategory"][number]>();
  for (const expense of expenses) {
    const paid = expense.status === "PAID" ? expense.amountPaise : 0;
    if (expense.status === "PAID") paidPaise += expense.amountPaise;
    else pendingPaise += expense.amountPaise;

    const id = expense.eventId?.toString() ?? null;
    const eventRow = byEvent.get(id ?? "none") ?? {
      eventId: id,
      name: (id && eventName.get(id)) || "No event",
      totalPaise: 0,
      paidPaise: 0,
    };
    eventRow.totalPaise += expense.amountPaise;
    eventRow.paidPaise += paid;
    byEvent.set(id ?? "none", eventRow);

    const categoryRow = byCategory.get(expense.category) ?? {
      category: expense.category,
      totalPaise: 0,
      paidPaise: 0,
    };
    categoryRow.totalPaise += expense.amountPaise;
    categoryRow.paidPaise += paid;
    byCategory.set(expense.category, categoryRow);
  }

  const pending = expenses
    .filter(
      (expense): expense is typeof expense & { dueDate: string } =>
        expense.status === "PENDING" && Boolean(expense.dueDate),
    )
    .sort(
      (a, b) =>
        a.dueDate.localeCompare(b.dueDate) ||
        a._id.toString().localeCompare(b._id.toString()),
    );
  const describe = (expense: (typeof pending)[number]) =>
    labelOf(
      expense,
      expense.eventId ? eventName.get(expense.eventId.toString()) : undefined,
    );
  const first = pending[0];

  return {
    totalPaise: paidPaise + pendingPaise,
    paidPaise,
    pendingPaise,
    nextDue: first
      ? {
          id: first._id.toString(),
          description: describe(first),
          dueDate: first.dueDate,
        }
      : null,
    pendingPayments: pending.slice(0, 3).map((expense) => ({
      id: expense._id.toString(),
      description: describe(expense),
      vendorName: null,
      amountPaise: expense.amountPaise,
      dueDate: expense.dueDate,
    })),
    byEvent: [...byEvent.values()].sort((a, b) => b.totalPaise - a.totalPaise),
    byCategory: [...byCategory.values()].sort(
      (a, b) =>
        b.totalPaise - a.totalPaise ||
        CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category),
    ),
    count: expenses.length,
  };
}

/**
 * Expenses' part in deleting an event (Database Design "What happens on
 * delete"): Pending expenses block it; Paid ones move under "No event".
 */
export const expenseEventLinks: EventLinks = {
  async check(ctx, eventId) {
    const { Expense } = await models();
    const expenses = await Expense.find(
      { weddingId: ctx.weddingId, eventId },
      { status: 1, amountPaise: 1, description: 1, category: 1 },
    );
    return {
      blockingExpenses: expenses
        .filter((expense) => expense.status === "PENDING")
        .map((expense) => ({
          id: expense._id.toString(),
          description: labelOf(expense),
          amountPaise: expense.amountPaise,
        })),
      willUnlink: {
        tasks: 0,
        paidExpenses: expenses.filter((expense) => expense.status === "PAID")
          .length,
        photos: 0,
        guests: 0,
      },
    };
  },
  async unlink(ctx, eventId, session) {
    const { Expense } = await models();
    await Expense.updateMany(
      { weddingId: ctx.weddingId, eventId },
      { $unset: { eventId: "" } },
      { session },
    );
  },
};

/**
 * Deleting a task keeps its expenses but removes the link, in the delete's
 * transaction (Database Design "What happens on delete").
 */
export async function unlinkTaskExpenses(
  deleted: { weddingId: string; taskId: string },
  session: ClientSession,
): Promise<void> {
  const { Expense } = await models();
  await Expense.updateMany(
    { weddingId: deleted.weddingId, taskId: deleted.taskId },
    { $unset: { taskId: "" } },
    { session },
  );
}
