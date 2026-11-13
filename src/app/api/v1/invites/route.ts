import { authorizeRequest } from "@/lib/session";
import { createInvite, inviteSchema, weddingPolicy } from "@/modules/wedding";
import { errorResponse, ok } from "@/platform/http";
import { parseJsonBody, requireCsrfHeader } from "@/platform/request";
import { createRequestId } from "@/platform/request-id";

const headers = { "Cache-Control": "no-store" };

/** POST /api/v1/invites: invite an organiser by email (Admin), 201. */
export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    requireCsrfHeader(request);
    const { ctx, session } = await authorizeRequest(
      weddingPolicy,
      "members.invite",
    );
    const input = await parseJsonBody(request, inviteSchema);
    const invite = await createInvite(ctx, session.result.user.name, input);
    return ok(invite, { requestId, headers, status: 201 });
  } catch (err) {
    return errorResponse(err, { requestId, headers });
  }
}
