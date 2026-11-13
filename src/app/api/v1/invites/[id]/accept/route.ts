import { readSession } from "@/lib/session";
import { acceptInvite } from "@/modules/wedding";
import { AppError } from "@/platform/errors";
import { errorResponse, ok } from "@/platform/http";
import { requireCsrfHeader } from "@/platform/request";
import { createRequestId } from "@/platform/request-id";

const headers = { "Cache-Control": "no-store" };

/**
 * POST /api/v1/invites/{token}/accept: join the wedding, signed in with the
 * invited email. (The folder is [id] because Next.js needs one name for a
 * dynamic segment; here it carries the invite's token.)
 */
export async function POST(
  request: Request,
  { params }: RouteContext<"/api/v1/invites/[id]/accept">,
) {
  const requestId = createRequestId();
  try {
    requireCsrfHeader(request);
    const session = await readSession();
    if (!session) {
      throw new AppError("UNAUTHENTICATED", 401, "Please log in to continue.");
    }
    const { user } = session.result;
    const joined = await acceptInvite(
      { id: user.id, email: user.email },
      (await params).id,
    );
    return ok(joined, { requestId, headers });
  } catch (err) {
    return errorResponse(err, { requestId, headers });
  }
}
