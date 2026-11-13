import { readSession } from "@/lib/session";
import {
  logInUser,
  logout,
  setSessionCookie,
  verifyEmail,
  verifySchema,
} from "@/modules/auth";
import { membershipOf } from "@/modules/wedding";
import { errorResponse, ok } from "@/platform/http";
import { clientIp } from "@/platform/rate-limit";
import { parseJsonBody, requireCsrfHeader } from "@/platform/request";
import { createRequestId } from "@/platform/request-id";

const headers = { "Cache-Control": "no-store" };

/**
 * POST /api/v1/auth/verify: confirm an email from its link and log in
 * (PRD F1: "user clicks the link → logged in"), e.g. when the email is
 * opened on another device. A POST, not the link's GET, so mail scanners
 * that open links can't use them up.
 */
export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    requireCsrfHeader(request);
    const { token } = await parseJsonBody(request, verifySchema);
    const userId = await verifyEmail(token);

    const response = ok({ emailVerified: true }, { requestId, headers });
    const current = await readSession();
    if (current?.context.userId !== userId) {
      // Someone else was logged in on this device: their session ends.
      if (current) await logout(current.token);
      const started = await logInUser(
        userId,
        {
          ip: clientIp(request.headers),
          userAgent: request.headers.get("user-agent"),
        },
        undefined,
        membershipOf,
      );
      setSessionCookie(response, started.token, started.expiresAt);
    }
    return response;
  } catch (err) {
    return errorResponse(err, { requestId, headers });
  }
}
