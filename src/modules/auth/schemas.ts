// Zod request schemas for the auth endpoints (docs/API Design v1.md). The
// field rules are shared with the sign-up and log-in forms via
// src/lib/auth-rules.ts, so the two can't disagree.
import { z } from "zod";

import {
  emailError,
  nameError,
  newPasswordError,
  passwordEnteredError,
} from "@/lib/auth-rules";

function rule(check: (value: string) => string | null) {
  return (value: string, ctx: z.RefinementCtx) => {
    const message = check(value);
    if (message) ctx.addIssue({ code: "custom", message });
  };
}

const email = z
  .string()
  .superRefine(rule(emailError))
  .transform((value) => value.trim().toLowerCase());

export const signupSchema = z
  .object({
    name: z
      .string()
      .superRefine(rule(nameError))
      .transform((value) => value.trim()),
    email,
    password: z.string(),
  })
  .superRefine(({ password, email }, ctx) => {
    const message = newPasswordError(password, email);
    if (message) ctx.addIssue({ code: "custom", path: ["password"], message });
  });

export const loginSchema = z.object({
  email,
  password: z.string().superRefine(rule(passwordEnteredError)),
});

export const verifySchema = z.object({
  token: z.string().min(1, "The link is missing its code").max(200),
});

export const forgotSchema = z.object({ email });

/** The password rules need the account's email, so the service checks them. */
export const resetSchema = z.object({
  token: z.string().min(1, "The link is missing its code").max(200),
  password: z.string().min(1, "Choose a password").max(256),
});

/**
 * PATCH /auth/me: a new name, a new password (with the current one), or
 * both. The password rules need the account's email, so the service checks
 * them.
 */
export const updateAccountSchema = z
  .object({
    name: z
      .string()
      .superRefine(rule(nameError))
      .transform((value) => value.trim())
      .optional(),
    currentPassword: z.string().max(256).optional(),
    newPassword: z.string().max(256).optional(),
  })
  .refine(
    (value) => value.name !== undefined || value.newPassword !== undefined,
    { message: "Nothing to change" },
  );

export type SignupInput = z.output<typeof signupSchema>;
export type LoginInput = z.output<typeof loginSchema>;
