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

export const PAST_DATE_MESSAGE = "The wedding date can't be in the past";

/** A calendar date, YYYY-MM-DD; whether it may be past is checked separately. */
const weddingDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose the wedding date")
  // Date.parse accepts "2028-02-30" (rolling it to March 1), so the date
  // must read back unchanged.
  .refine((date) => {
    const parsed = new Date(`${date}T00:00:00Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === date
    );
  }, "Choose a real date");

// The PRD's "Wedding setup" fields, shared by creating and editing.
const setupFields = {
  brideName: required("the bride's name", 80),
  groomName: required("the groom's name", 80),
  title: required("a name for the wedding", 100),
  date: weddingDate,
  city: required("the city", 80),
  slug: slugSchema,
  description: z.string().trim().max(2000, "Use at most 2,000 characters"),
  tagline: z.string().trim().max(120, "Use at most 120 characters"),
};

export const createWeddingSchema = z.object({
  ...setupFields,
  date: weddingDate.refine(
    (date) => date >= todayInKolkata(),
    PAST_DATE_MESSAGE,
  ),
  description: setupFields.description.optional(),
  tagline: setupFields.tagline.optional(),
});

/**
 * PATCH /wedding (API Design; PRD "Wedding setup, editable later"): any of
 * the setup fields, sent only when changed. An empty description clears it;
 * an empty tagline goes back to the default. A past date is refused only
 * when the date changes, so details stay editable after the wedding (the
 * service checks it). The RSVP cutoff and upload cap arrive with RSVP and
 * the gallery (decision 66).
 */
export const updateWeddingSchema = z
  .object(setupFields)
  .partial()
  .refine((value) => Object.values(value).some((v) => v !== undefined), {
    message: "Nothing to change",
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
export type UpdateWeddingInput = z.output<typeof updateWeddingSchema>;
export type InviteInput = z.output<typeof inviteSchema>;
export type UpdateMemberInput = z.output<typeof updateMemberSchema>;
