import { authorizeRequest } from "@/lib/session";
import { expenseSummary, expensesPolicy } from "@/modules/expenses";
import { errorResponse, ok } from "@/platform/http";
import { createRequestId } from "@/platform/request-id";

const headers = { "Cache-Control": "no-store" };

/** GET /api/v1/expenses/summary: totals overall, per event, per category, pending. */
export async function GET() {
  const requestId = createRequestId();
  try {
    const { ctx } = await authorizeRequest(expensesPolicy, "expenses.list");
    return ok(await expenseSummary(ctx), { requestId, headers });
  } catch (err) {
    return errorResponse(err, { requestId, headers });
  }
}
