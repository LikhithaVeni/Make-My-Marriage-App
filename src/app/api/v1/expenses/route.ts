import { authorizeRequest } from "@/lib/session";
import {
  createExpense,
  createExpenseSchema,
  expensesPolicy,
  listExpenses,
  parseExpenseQuery,
} from "@/modules/expenses";
import { AppError } from "@/platform/errors";
import { errorResponse, list, ok } from "@/platform/http";
import { parseJsonBody, requireCsrfHeader } from "@/platform/request";
import { createRequestId } from "@/platform/request-id";

const headers = { "Cache-Control": "no-store" };

/** GET /api/v1/expenses: the list with filters, sorts and paging (Admin, Manager). */
export async function GET(request: Request) {
  const requestId = createRequestId();
  try {
    const { ctx } = await authorizeRequest(expensesPolicy, "expenses.list");
    const parsed = parseExpenseQuery(new URL(request.url).searchParams);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fields[String(issue.path[0] ?? "query")] ??= issue.message;
      }
      throw new AppError(
        "VALIDATION_FAILED",
        400,
        "Some filters are invalid.",
        { fields },
      );
    }
    const page = await listExpenses(ctx, parsed.data);
    return list(
      page.expenses,
      { nextCursor: page.nextCursor, limit: page.limit },
      { requestId, headers },
    );
  } catch (err) {
    return errorResponse(err, { requestId, headers });
  }
}

/** POST /api/v1/expenses: record an expense (Admin, Manager), 201. */
export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    requireCsrfHeader(request);
    const { ctx } = await authorizeRequest(expensesPolicy, "expenses.create");
    const input = await parseJsonBody(request, createExpenseSchema);
    return ok(await createExpense(ctx, input), {
      requestId,
      headers,
      status: 201,
    });
  } catch (err) {
    return errorResponse(err, { requestId, headers });
  }
}
