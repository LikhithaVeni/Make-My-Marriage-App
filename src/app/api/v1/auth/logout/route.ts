import type { NextRequest } from "next/server";

import { clearSessionCookie, logout, SESSION_COOKIE } from "@/modules/auth";
import { errorResponse, noContent } from "@/platform/http";
import { requireCsrfHeader } from "@/platform/request";
import { createRequestId } from "@/platform/request-id";

/** POST /api/v1/auth/logout: end this session and clear the cookie (204). */
export async function POST(request: NextRequest) {
  const requestId = createRequestId();
  try {
    requireCsrfHeader(request);
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (token) await logout(token);
    const response = noContent({ requestId });
    clearSessionCookie(response);
    return response;
  } catch (err) {
    return errorResponse(err, { requestId });
  }
}
