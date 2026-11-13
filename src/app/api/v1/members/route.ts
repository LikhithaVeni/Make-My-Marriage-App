import { authorizeRequest } from "@/lib/session";
import { listMembers, weddingPolicy } from "@/modules/wedding";
import { errorResponse, ok } from "@/platform/http";
import { createRequestId } from "@/platform/request-id";

const headers = { "Cache-Control": "no-store" };

/** GET /api/v1/members: members and pending invites (Admin). */
export async function GET() {
  const requestId = createRequestId();
  try {
    const { ctx } = await authorizeRequest(weddingPolicy, "members.list");
    return ok(await listMembers(ctx), { requestId, headers });
  } catch (err) {
    return errorResponse(err, { requestId, headers });
  }
}
