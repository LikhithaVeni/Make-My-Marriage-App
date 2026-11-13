import { authorizeRequest } from "@/lib/session";
import {
  removeMember,
  updateMember,
  updateMemberSchema,
  weddingPolicy,
} from "@/modules/wedding";
import { errorResponse, noContent, ok } from "@/platform/http";
import { parseJsonBody, requireCsrfHeader } from "@/platform/request";
import { createRequestId } from "@/platform/request-id";

const headers = { "Cache-Control": "no-store" };

/** PATCH /api/v1/members/{userId}: change role or relation label (Admin). */
export async function PATCH(
  request: Request,
  { params }: RouteContext<"/api/v1/members/[userId]">,
) {
  const requestId = createRequestId();
  try {
    requireCsrfHeader(request);
    const { ctx } = await authorizeRequest(weddingPolicy, "members.update");
    const input = await parseJsonBody(request, updateMemberSchema);
    await updateMember(ctx, (await params).userId, input);
    return ok({ updated: true }, { requestId, headers });
  } catch (err) {
    return errorResponse(err, { requestId, headers });
  }
}

/** DELETE /api/v1/members/{userId}: remove a member (Admin), 204. */
export async function DELETE(
  request: Request,
  { params }: RouteContext<"/api/v1/members/[userId]">,
) {
  const requestId = createRequestId();
  try {
    requireCsrfHeader(request);
    const { ctx } = await authorizeRequest(weddingPolicy, "members.remove");
    await removeMember(ctx, (await params).userId);
    return noContent({ requestId });
  } catch (err) {
    return errorResponse(err, { requestId, headers });
  }
}
