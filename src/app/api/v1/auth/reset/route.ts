import { resetPassword, resetSchema, setSessionCookie } from "@/modules/auth";
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

/**
 * POST /api/v1/auth/reset: set a new password from the emailed link, end all
 * sessions and start a new one here (200).
 */
export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    requireCsrfHeader(request);
    const ip = clientIp(request.headers);
    await enforceRateLimit(`reset:ip:${ip}`, AUTH_RATE_LIMIT);
    const { token, password } = await parseJsonBody(request, resetSchema);
    const session = await resetPassword(
      token,
      password,
      { ip, userAgent: request.headers.get("user-agent") },
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
