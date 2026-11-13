import { cookies } from "next/headers";

import { readSession } from "@/lib/session";
import {
  clearSessionCookie,
  SESSION_COOKIE,
  setSessionCookie,
  updateAccount,
  updateAccountSchema,
} from "@/modules/auth";
import { AppError } from "@/platform/errors";
import { errorResponse, ok } from "@/platform/http";
import { AUTH_RATE_LIMIT, enforceRateLimit } from "@/platform/rate-limit";
import { parseJsonBody, requireCsrfHeader } from "@/platform/request";
import { createRequestId } from "@/platform/request-id";

const headers = { "Cache-Control": "no-store" };

/** GET /api/v1/auth/me: the signed-in user, their wedding and role. */
export async function GET() {
  const requestId = createRequestId();
  try {
    const session = await readSession();
    if (!session) {
      const response = errorResponse(
        new AppError("UNAUTHENTICATED", 401, "Please log in to continue."),
        { requestId, headers },
      );
      if ((await cookies()).has(SESSION_COOKIE)) clearSessionCookie(response);
      return response;
    }

    const response = ok(session.result, { requestId, headers });
    if (session.extendedTo) {
      setSessionCookie(response, session.token, session.extendedTo);
    }
    return response;
  } catch (err) {
    return errorResponse(err, { requestId, headers });
  }
}

/**
 * PATCH /api/v1/auth/me: change your name or password (the current password
 * is needed for a new one). Limited per user, like log in, so the current
 * password can't be guessed.
 */
export async function PATCH(request: Request) {
  const requestId = createRequestId();
  try {
    requireCsrfHeader(request);
    const session = await readSession();
    if (!session) {
      throw new AppError("UNAUTHENTICATED", 401, "Please log in to continue.");
    }
    await enforceRateLimit(
      `account:user:${session.context.userId}`,
      AUTH_RATE_LIMIT,
    );
    const input = await parseJsonBody(request, updateAccountSchema);
    const user = await updateAccount(
      session.context.userId,
      session.token,
      input,
    );
    return ok({ user }, { requestId, headers });
  } catch (err) {
    return errorResponse(err, { requestId, headers });
  }
}
