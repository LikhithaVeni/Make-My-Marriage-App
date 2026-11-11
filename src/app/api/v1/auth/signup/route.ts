import { setSessionCookie, signup, signupSchema } from "@/modules/auth";
import { errorResponse, ok } from "@/platform/http";
import {
  AUTH_RATE_LIMIT,
  clientIp,
  enforceRateLimit,
} from "@/platform/rate-limit";
import { parseJsonBody, requireCsrfHeader } from "@/platform/request";
import { createRequestId } from "@/platform/request-id";

const headers = { "Cache-Control": "no-store" };

/** POST /api/v1/auth/signup: create the account and start a session (201). */
export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    requireCsrfHeader(request);
    const ip = clientIp(request.headers);
    await enforceRateLimit(`signup:ip:${ip}`, AUTH_RATE_LIMIT);
    const input = await parseJsonBody(request, signupSchema);
    const session = await signup(input, {
      ip,
      userAgent: request.headers.get("user-agent"),
    });
    const response = ok(session.result, { requestId, headers, status: 201 });
    setSessionCookie(response, session.token, session.expiresAt);
    return response;
  } catch (err) {
    return errorResponse(err, { requestId, headers });
  }
}
