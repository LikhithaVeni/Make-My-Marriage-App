// Zod request schemas for the wedding endpoints (docs/API Design v1.md,
// "Create wedding"; fields from the PRD's "Wedding setup").
import { z } from "zod";

import { emailError, nameError } from "@/lib/auth-rules";
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

/** Roles an Admin can give through an invite (the photographer is separate). */
export const organiserRole = z.enum(["ADMIN", "MANAGER"], {
  error: "Choose Admin or Manager",
});

const relationLabel = z
  .string()
  .trim()
  .max(60, "Use at most 60 characters")
  .transform((value) => value || undefined)
  .optional();

/** POST /invites (API Design "Invite and accept"). */
export const inviteSchema = z.object({
  name: z
    .string()
    .superRefine((value, ctx) => {
      const message = nameError(value);
      if (message) ctx.addIssue({ code: "custom", message });
    })
    .transform((value) => value.trim()),
  email: z
    .string()
    .superRefine((value, ctx) => {
      const message = emailError(value);
      if (message) ctx.addIssue({ code: "custom", message });
    })
    .transform((value) => value.trim().toLowerCase()),
  role: organiserRole,
  relationLabel,
});

/**
 * PATCH /members/{userId}: a new role, a new relation label, or both. An
 * empty label clears it.
 */
export const updateMemberSchema = z
  .object({
    role: organiserRole.optional(),
    relationLabel: z
      .string()
      .trim()
      .max(60, "Use at most 60 characters")
      .optional(),
  })
  .refine((value) => value.role || value.relationLabel !== undefined, {
    message: "Nothing to change",
  });

export type CreateWeddingInput = z.output<typeof createWeddingSchema>;
export type InviteInput = z.output<typeof inviteSchema>;
export type UpdateMemberInput = z.output<typeof updateMemberSchema>;
