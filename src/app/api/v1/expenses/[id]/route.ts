import { authorizeRequest } from "@/lib/session";
import {
  deleteExpense,
  expensesPolicy,
  getExpense,
  updateExpense,
  updateExpenseSchema,
} from "@/modules/expenses";
import { errorResponse, noContent, ok } from "@/platform/http";
import { parseJsonBody, requireCsrfHeader } from "@/platform/request";
import { createRequestId } from "@/platform/request-id";

const headers = { "Cache-Control": "no-store" };

/** GET /api/v1/expenses/{id}: one expense (Admin, Manager). */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/v1/expenses/[id]">,
) {
  const requestId = createRequestId();
  try {
    const { ctx } = await authorizeRequest(expensesPolicy, "expenses.view");
    return ok(await getExpense(ctx, (await params).id), { requestId, headers });
  } catch (err) {
    return errorResponse(err, { requestId, headers });
  }
}

/** PATCH /api/v1/expenses/{id}: edit or mark paid (Admin, Manager). */
export async function PATCH(
  request: Request,
  { params }: RouteContext<"/api/v1/expenses/[id]">,
) {
  const requestId = createRequestId();
  try {
    requireCsrfHeader(request);
    const { ctx } = await authorizeRequest(expensesPolicy, "expenses.update");
    const input = await parseJsonBody(request, updateExpenseSchema);
    return ok(await updateExpense(ctx, (await params).id, input), {
      requestId,
      headers,
    });
  } catch (err) {
    return errorResponse(err, { requestId, headers });
  }
}

/** DELETE /api/v1/expenses/{id}: delete (Admin, Manager), 204. */
export async function DELETE(
  request: Request,
  { params }: RouteContext<"/api/v1/expenses/[id]">,
) {
  const requestId = createRequestId();
  try {
    requireCsrfHeader(request);
    const { ctx } = await authorizeRequest(expensesPolicy, "expenses.delete");
    await deleteExpense(ctx, (await params).id);
    return noContent({ requestId, headers });
  } catch (err) {
    return errorResponse(err, { requestId, headers });
  }
}
