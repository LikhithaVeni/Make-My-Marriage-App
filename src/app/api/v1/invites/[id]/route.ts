import { authorizeRequest } from "@/lib/session";
import { cancelInvite, weddingPolicy } from "@/modules/wedding";
import { errorResponse, noContent } from "@/platform/http";
import { requireCsrfHeader } from "@/platform/request";
import { createRequestId } from "@/platform/request-id";

/** DELETE /api/v1/invites/{id}: cancel a pending invite (Admin), 204. */
export async function DELETE(
  request: Request,
  { params }: RouteContext<"/api/v1/invites/[id]">,
) {
  const requestId = createRequestId();
  try {
    requireCsrfHeader(request);
    const { ctx } = await authorizeRequest(weddingPolicy, "members.invite");
    await cancelInvite(ctx, (await params).id);
    return noContent({ requestId });
  } catch (err) {
    return errorResponse(err, { requestId });
  }
}
