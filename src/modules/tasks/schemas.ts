// Zod request schemas for the tasks endpoints (docs/API Design v1.md,
// "Tasks"; fields from the PRD's "Tasks" table and Database Design's
// "tasks").
import { z } from "zod";

import { PRIORITIES, STATUSES } from "./model";

const objectId = z.string().regex(/^[0-9a-f]{24}$/i, "Choose from the list");

/** A real calendar date, YYYY-MM-DD ("2028-02-30" is refused). */
const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date")
  .refine((date) => {
    const parsed = new Date(`${date}T00:00:00Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === date
    );
  }, "Choose a real date");

/** "" means "not set": no event, unassigned, no due date, no notes. */
const empty = z.literal("");

const fields = {
  title: z
    .string()
    .trim()
    .min(1, "Enter what needs doing")
    .max(200, "Use at most 200 characters"),
  description: z.string().trim().max(2000, "Use at most 2,000 characters"),
  eventId: z.union([empty, objectId]),
  assigneeId: z.union([empty, objectId]),
  dueDate: z.union([empty, calendarDate]),
  priority: z.enum(PRIORITIES, { error: "Choose Low, Medium or High" }),
  status: z.enum(STATUSES, {
    error: "Choose To Do, In Progress or Completed",
  }),
};

/** POST /tasks (Admin, Manager). New tasks start To Do (PRD). */
export const createTaskSchema = z.object({
  title: fields.title,
  description: fields.description.optional(),
  eventId: fields.eventId.optional(),
  assigneeId: fields.assigneeId.optional(),
  dueDate: fields.dueDate.optional(),
  priority: fields.priority.default("MEDIUM"),
});

/**
 * PATCH /tasks/{id}: any field, sent only when changed; "" clears an
 * optional one. Status moves are free in any direction (decision 71).
 */
export const updateTaskSchema = z
  .object(fields)
  .partial()
  .refine((value) => Object.values(value).some((v) => v !== undefined), {
    message: "Nothing to change",
  });

export const TASK_SORTS = ["dueDate", "-priority", "-createdAt"] as const;
export type TaskSort = (typeof TASK_SORTS)[number];

/**
 * GET /tasks filters (API Design): `eventId` (or `none`), `assigneeId` (or
 * `me`, `none`), `status` (repeatable), `priority`, `overdue=true`,
 * `dueBefore`, `q`; sort `dueDate` (default, empty last), `-priority`,
 * `-createdAt`; cursor paging, 50 by default, at most 100.
 */
export const listTasksQuerySchema = z.object({
  eventId: z.union([z.literal("none"), objectId]).optional(),
  assigneeId: z
    .union([z.literal("me"), z.literal("none"), objectId])
    .optional(),
  status: z.array(fields.status).optional(),
  priority: fields.priority.optional(),
  overdue: z.literal("true").optional(),
  dueBefore: calendarDate.optional(),
  q: z.string().trim().max(100).optional(),
  sort: z.enum(TASK_SORTS).default("dueDate"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().max(500).optional(),
});

/** Reads GET /tasks query parameters; `status` may repeat. */
export function parseTaskQuery(params: URLSearchParams) {
  const raw: Record<string, unknown> = {};
  for (const key of new Set(params.keys())) {
    const values = params.getAll(key).filter((value) => value !== "");
    if (values.length === 0) continue;
    raw[key] = key === "status" ? values : values[0];
  }
  return listTasksQuerySchema.safeParse(raw);
}

export type CreateTaskInput = z.output<typeof createTaskSchema>;
export type UpdateTaskInput = z.output<typeof updateTaskSchema>;
export type TaskQuery = z.output<typeof listTasksQuerySchema>;
