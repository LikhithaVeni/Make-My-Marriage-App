import { readSession } from "@/lib/session";
import { createWedding, createWeddingSchema } from "@/modules/wedding";
import { AppError } from "@/platform/errors";
import { errorResponse, ok } from "@/platform/http";
import { parseJsonBody, requireCsrfHeader } from "@/platform/request";
import { createRequestId } from "@/platform/request-id";

const headers = { "Cache-Control": "no-store" };

/**
 * POST /api/v1/wedding: create the wedding; the caller becomes its Admin
 * (201). Signed in, verified and not yet in a wedding.
 */
export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    requireCsrfHeader(request);
    const session = await readSession();
    if (!session) {
      throw new AppError("UNAUTHENTICATED", 401, "Please log in to continue.");
    }
    const input = await parseJsonBody(request, createWeddingSchema);
    const created = await createWedding(session.context, input);
    return ok(created, { requestId, headers, status: 201 });
  } catch (err) {
    return errorResponse(err, { requestId, headers });
  }
}
