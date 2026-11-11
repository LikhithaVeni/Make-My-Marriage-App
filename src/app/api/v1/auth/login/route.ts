import { login, loginSchema, setSessionCookie } from "@/modules/auth";
import { membershipOf } from "@/modules/wedding";
import { errorResponse, ok } from "@/platform/http";
import {
  AUTH_RATE_LIMIT,
  clientIp,
  enforceRateLimit,
} from "@/platform/rate-limit";
import { parseJsonBody, requireCsrfHeader } from "@/platform/request";
import { createRequestId } from "@/platform/request-id";

const headers = { "Cache-Control": "no-store" };

/** POST /api/v1/auth/login: start a session (200). */
export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    requireCsrfHeader(request);
    const ip = clientIp(request.headers);
    await enforceRateLimit(`login:ip:${ip}`, AUTH_RATE_LIMIT);
    const input = await parseJsonBody(request, loginSchema);
    const session = await login(
      input,
      {
        ip,
        userAgent: request.headers.get("user-agent"),
      },
      undefined,
      membershipOf,
    );
    const response = ok(session.result, { requestId, headers });
    setSessionCookie(response, session.token, session.expiresAt);
    return response;
  } catch (err) {
    return errorResponse(err, { requestId, headers });
  }
}
