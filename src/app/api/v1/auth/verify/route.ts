import { verifyEmail, verifySchema } from "@/modules/auth";
import { errorResponse, ok } from "@/platform/http";
import { parseJsonBody, requireCsrfHeader } from "@/platform/request";
import { createRequestId } from "@/platform/request-id";

const headers = { "Cache-Control": "no-store" };

/**
 * POST /api/v1/auth/verify: confirm an email from its link (200). A POST, not
 * the link's GET, so mail scanners that open links can't use them up.
 */
export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    requireCsrfHeader(request);
    const { token } = await parseJsonBody(request, verifySchema);
    await verifyEmail(token);
    return ok({ emailVerified: true }, { requestId, headers });
  } catch (err) {
    return errorResponse(err, { requestId, headers });
  }
}
