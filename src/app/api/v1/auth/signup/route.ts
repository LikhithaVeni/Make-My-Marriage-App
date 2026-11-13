import { setSessionCookie, signup, signupSchema } from "@/modules/auth";
import { acceptInvite, membershipOf, previewInvite } from "@/modules/wedding";
import { AppError } from "@/platform/errors";
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
 * POST /api/v1/auth/signup: create the account and start a session (201).
 * With `?invite=<token>` (PRD F2, step 3) the invite is checked first, no
 * verification email is sent (the invite link proves the inbox), and the new
 * account joins the wedding straight away.
 */
export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    requireCsrfHeader(request);
    const ip = clientIp(request.headers);
    await enforceRateLimit(`signup:ip:${ip}`, AUTH_RATE_LIMIT);
    const input = await parseJsonBody(request, signupSchema);

    const inviteToken = new URL(request.url).searchParams.get("invite");
    if (inviteToken) {
      const invite = await previewInvite(inviteToken);
      if (invite.email !== input.email) {
        throw new AppError(
          "FORBIDDEN",
          403,
          `This invite is for ${invite.email}. Sign up with that email to accept it.`,
        );
      }
    }

    const session = await signup(
      input,
      { ip, userAgent: request.headers.get("user-agent") },
      undefined,
      { sendVerification: !inviteToken },
    );
    let result = session.result;
    if (inviteToken) {
      await acceptInvite(
        { id: result.user.id, email: result.user.email },
        inviteToken,
      );
      const membership = await membershipOf(result.user.id);
      result = {
        user: { ...result.user, emailVerified: true },
        wedding: membership?.wedding ?? null,
        role: membership?.role ?? null,
      };
    }

    const response = ok(result, { requestId, headers, status: 201 });
    setSessionCookie(response, session.token, session.expiresAt);
    return response;
  } catch (err) {
    return errorResponse(err, { requestId, headers });
  }
}
