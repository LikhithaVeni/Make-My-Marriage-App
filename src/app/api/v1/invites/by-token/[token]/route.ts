import { previewInvite } from "@/modules/wedding";
import { errorResponse, ok } from "@/platform/http";
import { createRequestId } from "@/platform/request-id";

const headers = { "Cache-Control": "no-store" };

/**
 * GET /api/v1/invites/by-token/{token}: show the invite before signing up
 * (anyone with the link).
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/v1/invites/by-token/[token]">,
) {
  const requestId = createRequestId();
  try {
    return ok(await previewInvite((await params).token), {
      requestId,
      headers,
    });
  } catch (err) {
    return errorResponse(err, { requestId, headers });
  }
}
