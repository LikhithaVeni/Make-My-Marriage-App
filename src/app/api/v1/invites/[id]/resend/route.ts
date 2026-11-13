import { authorizeRequest } from "@/lib/session";
import { resendInvite, weddingPolicy } from "@/modules/wedding";
import { errorResponse, ok } from "@/platform/http";
import { requireCsrfHeader } from "@/platform/request";
import { createRequestId } from "@/platform/request-id";

const headers = { "Cache-Control": "no-store" };

/** POST /api/v1/invites/{id}/resend: new link and 7 more days (Admin), 202. */
export async function POST(
  request: Request,
  { params }: RouteContext<"/api/v1/invites/[id]/resend">,
) {
  const requestId = createRequestId();
  try {
    requireCsrfHeader(request);
    const { ctx, session } = await authorizeRequest(
      weddingPolicy,
      "members.invite",
    );
    await resendInvite(ctx, session.result.user.name, (await params).id);
    return ok({ sent: true }, { requestId, headers, status: 202 });
  } catch (err) {
    return errorResponse(err, { requestId, headers });
  }
}
