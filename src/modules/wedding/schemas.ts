// Zod request schemas for the wedding endpoints (docs/API Design v1.md,
// "Create wedding"; fields from the PRD's "Wedding setup").
import { z } from "zod";

import { todayInKolkata } from "@/lib/format";

export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/;

const required = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `Enter ${label}`)
    .max(max, `Use at most ${max} characters`);

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    SLUG_PATTERN,
    "Use 3–40 lowercase letters, numbers and hyphens, starting and ending with a letter or number",
  );

export const createWeddingSchema = z.object({
  brideName: required("the bride's name", 80),
  groomName: required("the groom's name", 80),
  title: required("a name for the wedding", 100),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose the wedding date")
    .refine((date) => !Number.isNaN(Date.parse(date)), "Choose a real date")
    .refine(
      (date) => date >= todayInKolkata(),
      "The wedding date can't be in the past",
    ),
  city: required("the city", 80),
  slug: slugSchema,
  description: z
    .string()
    .trim()
    .max(2000, "Use at most 2,000 characters")
    .optional(),
  tagline: z.string().trim().max(120, "Use at most 120 characters").optional(),
});

export type CreateWeddingInput = z.output<typeof createWeddingSchema>;
