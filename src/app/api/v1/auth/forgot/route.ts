import { forgotSchema, requestPasswordReset } from "@/modules/auth";
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
 * POST /api/v1/auth/forgot: email a reset link if the account exists. Always
 * 202, so the answer can't reveal who has an account.
 */
export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    requireCsrfHeader(request);
    await enforceRateLimit(
      `forgot:ip:${clientIp(request.headers)}`,
      AUTH_RATE_LIMIT,
    );
    const { email } = await parseJsonBody(request, forgotSchema);
    await requestPasswordReset(email);
    return ok({ sent: true }, { requestId, headers, status: 202 });
  } catch (err) {
    return errorResponse(err, { requestId, headers });
  }
}
