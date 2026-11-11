import "server-only";

import type { z } from "zod";

import { AppError } from "@/platform/errors";

// Request guards for route handlers (docs/API Design v1.md, "Headers").

export const CSRF_HEADER = "X-Requested-With";
export const CSRF_VALUE = "mmm";

/**
 * Mutations must carry `X-Requested-With: mmm`. Together with SameSite=Lax
 * cookies this is System Design's CSRF guard: a cross-site form can't set it.
 */
export function requireCsrfHeader(request: Request): void {
  if (request.headers.get(CSRF_HEADER) !== CSRF_VALUE) {
    throw new AppError("FORBIDDEN", 403, "This request isn't allowed.");
  }
}

/**
 * Reads the JSON body and validates it. Failures are 400 VALIDATION_FAILED
 * with `details.fields` mapping each field to its first message.
 */
export async function parseJsonBody<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<z.output<S>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new AppError(
      "VALIDATION_FAILED",
      400,
      "The request body must be JSON.",
      { fields: {} },
    );
  }

  const result = schema.safeParse(body);
  if (result.success) return result.data;

  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = issue.path.join(".") || "body";
    fields[field] ??= issue.message;
  }
  throw new AppError("VALIDATION_FAILED", 400, "Some fields are invalid.", {
    fields,
  });
}
