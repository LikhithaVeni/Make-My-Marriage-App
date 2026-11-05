import { readSession } from "@/lib/session";
import { resendVerificationEmail } from "@/modules/auth";
import { AppError } from "@/platform/errors";
import { errorResponse, ok } from "@/platform/http";
import { enforceRateLimit } from "@/platform/rate-limit";
import { requireCsrfHeader } from "@/platform/request";
import { createRequestId } from "@/platform/request-id";

const headers = { "Cache-Control": "no-store" };

/** At most 3 verification emails an hour per user (API Design). */
const RESEND_LIMIT = { limit: 3, windowMs: 60 * 60_000 };

/** POST /api/v1/auth/verify/resend: send a new verification link (202). */
export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    requireCsrfHeader(request);
    const session = await readSession();
    if (!session) {
      throw new AppError("UNAUTHENTICATED", 401, "Please log in to continue.");
    }
    await enforceRateLimit(
      `verify-resend:user:${session.context.userId}`,
      RESEND_LIMIT,
    );
    await resendVerificationEmail(session.context.userId);
    return ok({ sent: true }, { requestId, headers, status: 202 });
  } catch (err) {
    return errorResponse(err, { requestId, headers });
  }
}
