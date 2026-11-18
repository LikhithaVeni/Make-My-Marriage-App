// Zod schemas for the activity endpoint (docs/API Design v1.md: filters
// `actorId`, `entityType`, `from`, `to`; newest first).
import { z } from "zod";

import { ENTITY_TYPES } from "./model";

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

/** GET /activity: cursor paging, 50 by default, at most 100 (API Design). */
export const listActivityQuerySchema = z.object({
  actorId: z
    .string()
    .regex(/^[0-9a-f]{24}$/i, "Choose a person")
    .optional(),
  entityType: z.enum(ENTITY_TYPES, { error: "Choose an area" }).optional(),
  /** Calendar dates in India; `to` includes the whole day. */
  from: calendarDate.optional(),
  to: calendarDate.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z
    .string()
    .regex(/^[0-9a-f]{24}$/i, "This page link isn't valid")
    .optional(),
});

export function parseActivityQuery(params: URLSearchParams) {
  const raw: Record<string, string> = {};
  for (const [key, value] of params) if (value !== "") raw[key] = value;
  return listActivityQuerySchema.safeParse(raw);
}

export type ActivityQuery = z.output<typeof listActivityQuerySchema>;
