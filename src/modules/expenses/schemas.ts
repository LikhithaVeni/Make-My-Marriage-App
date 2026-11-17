// Zod request schemas for the expenses endpoints (docs/API Design v1.md,
// "Expenses"; fields from the PRD's "Expense fields" and Database Design's
// "expenses"). Money is integer paise.
import { z } from "zod";

import { CATEGORIES, EXPENSE_STATUSES } from "./model";

const objectId = z.string().regex(/^[0-9a-f]{24}$/i, "Choose from the list");

/** A real calendar date, YYYY-MM-DD ("2028-02-30" is refused). */
const calendarDate = (message: string) =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, message)
    .refine((date) => {
      const parsed = new Date(`${date}T00:00:00Z`);
      return (
        !Number.isNaN(parsed.getTime()) &&
        parsed.toISOString().slice(0, 10) === date
      );
    }, "Choose a real date");

/** Up to ₹10 crore for one expense; anything more is a typo. */
export const MAX_AMOUNT_PAISE = 10_00_00_000_00;

export const DUE_DATE_NEEDED = "Choose when it's due";

const fields = {
  amountPaise: z
    .number({ error: "Enter the amount" })
    .int("Use at most two decimal places")
    .min(1, "Enter an amount above ₹0")
    .max(MAX_AMOUNT_PAISE, "That's more than ₹10 crore; check the amount"),
  date: calendarDate("Choose the date"),
  eventId: objectId,
  /** "" removes the task. */
  taskId: z.union([z.literal(""), objectId]),
  category: z.enum(CATEGORIES, { error: "Pick a category" }),
  description: z.string().trim().max(2000, "Use at most 2,000 characters"),
  paidBy: z
    .string()
    .trim()
    .min(1, "Enter who paid, or will pay")
    .max(80, "Use at most 80 characters"),
  status: z.enum(EXPENSE_STATUSES, { error: "Choose Paid or Pending" }),
  /** "" removes the due date (allowed only when Paid). */
  dueDate: z.union([z.literal(""), calendarDate("Choose when it's due")]),
};

/**
 * POST /expenses (Admin, Manager). Database Design "Field rules": the amount
 * is more than 0, and a Pending expense needs a due date. The vendor link
 * arrives with Vendors (decision 74).
 */
export const createExpenseSchema = z
  .object({
    amountPaise: fields.amountPaise,
    date: fields.date,
    eventId: fields.eventId,
    taskId: fields.taskId.optional(),
    category: fields.category,
    description: fields.description.optional(),
    paidBy: fields.paidBy,
    status: fields.status,
    dueDate: fields.dueDate.optional(),
  })
  .superRefine((input, ctx) => {
    if (input.status === "PENDING" && !input.dueDate) {
      ctx.addIssue({
        code: "custom",
        path: ["dueDate"],
        message: DUE_DATE_NEEDED,
      });
    }
  });

/**
 * PATCH /expenses/{id}: any field, sent only when changed ("Edit, mark
 * paid"). The due-date rule is checked against the saved expense in the
 * service.
 */
export const updateExpenseSchema = z
  .object(fields)
  .partial()
  .refine((value) => Object.values(value).some((v) => v !== undefined), {
    message: "Nothing to change",
  });

export const EXPENSE_SORTS = ["-date", "dueDate", "-amountPaise"] as const;
export type ExpenseSort = (typeof EXPENSE_SORTS)[number];

/**
 * GET /expenses filters (API Design): `eventId` (or `none`), `taskId`,
 * `category`, `status`, `from`, `to`, `dueBefore`; sort `-date` (default),
 * `dueDate`, `-amountPaise`; cursor paging, 50 by default, at most 100.
 * `vendorId` arrives with Vendors.
 */
export const listExpensesQuerySchema = z.object({
  eventId: z.union([z.literal("none"), objectId]).optional(),
  taskId: objectId.optional(),
  category: fields.category.optional(),
  status: fields.status.optional(),
  from: calendarDate("Choose a date").optional(),
  to: calendarDate("Choose a date").optional(),
  dueBefore: calendarDate("Choose a date").optional(),
  sort: z.enum(EXPENSE_SORTS).default("-date"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().max(500).optional(),
});

/** Reads GET /expenses query parameters. */
export function parseExpenseQuery(params: URLSearchParams) {
  const raw: Record<string, string> = {};
  for (const [key, value] of params) if (value !== "") raw[key] = value;
  return listExpensesQuerySchema.safeParse(raw);
}

export type CreateExpenseInput = z.output<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.output<typeof updateExpenseSchema>;
export type ExpenseQuery = z.output<typeof listExpensesQuerySchema>;
