import { authorizeRequest, readSession } from "@/lib/session";
import {
  createWedding,
  createWeddingSchema,
  getWedding,
  updateWedding,
  updateWeddingSchema,
  weddingPolicy,
} from "@/modules/wedding";
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

/** GET /api/v1/wedding: the caller's wedding (Admin, Manager, Photographer). */
export async function GET() {
  const requestId = createRequestId();
  try {
    const { ctx } = await authorizeRequest(weddingPolicy, "wedding.view");
    return ok({ wedding: await getWedding(ctx) }, { requestId, headers });
  } catch (err) {
    return errorResponse(err, { requestId, headers });
  }
}

/** PATCH /api/v1/wedding: edit the wedding's details (Admin). */
export async function PATCH(request: Request) {
  const requestId = createRequestId();
  try {
    requireCsrfHeader(request);
    const { ctx } = await authorizeRequest(weddingPolicy, "wedding.update");
    const input = await parseJsonBody(request, updateWeddingSchema);
    return ok(
      { wedding: await updateWedding(ctx, input) },
      { requestId, headers },
    );
  } catch (err) {
    return errorResponse(err, { requestId, headers });
  }
}
