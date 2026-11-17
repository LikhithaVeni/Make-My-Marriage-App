import { authorizeRequest } from "@/lib/session";
import { dashboardPolicy, getDashboard } from "@/modules/dashboard";
import { errorResponse, ok } from "@/platform/http";
import { createRequestId } from "@/platform/request-id";

const headers = { "Cache-Control": "no-store" };

/** GET /api/v1/dashboard: every dashboard card in one call (Admin, Manager). */
export async function GET() {
  const requestId = createRequestId();
  try {
    const { ctx } = await authorizeRequest(dashboardPolicy, "dashboard.view");
    return ok(await getDashboard(ctx), { requestId, headers });
  } catch (err) {
    return errorResponse(err, { requestId, headers });
  }
}
