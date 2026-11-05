import { cookies } from "next/headers";

import { readSession } from "@/lib/session";
import {
  clearSessionCookie,
  SESSION_COOKIE,
  setSessionCookie,
} from "@/modules/auth";
import { AppError } from "@/platform/errors";
import { errorResponse, ok } from "@/platform/http";
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
