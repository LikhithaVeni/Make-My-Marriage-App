import { authorizeRequest } from "@/lib/session";
import { vendorsPolicy, weddingDayContacts } from "@/modules/vendors";
import { errorResponse, ok } from "@/platform/http";
import { createRequestId } from "@/platform/request-id";

const headers = { "Cache-Control": "no-store" };

/** GET /api/v1/vendors/contacts: who to call on the wedding day. */
export async function GET() {
  const requestId = createRequestId();
  try {
    const { ctx } = await authorizeRequest(vendorsPolicy, "vendors.list");
    return ok(
      { contacts: await weddingDayContacts(ctx) },
      { requestId, headers },
    );
  } catch (err) {
    return errorResponse(err, { requestId, headers });
  }
}
