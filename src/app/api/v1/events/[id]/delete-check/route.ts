import { authorizeRequest } from "@/lib/session";
import { checkEventDelete, eventsPolicy } from "@/modules/events";
import { expenseEventLinks } from "@/modules/expenses";
import { taskEventLinks } from "@/modules/tasks";
import { errorResponse, ok } from "@/platform/http";
import { createRequestId } from "@/platform/request-id";

const headers = { "Cache-Control": "no-store" };

/** GET /api/v1/events/{id}/delete-check: what a delete would change or block (Admin). */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/v1/events/[id]/delete-check">,
) {
  const requestId = createRequestId();
  try {
    const { ctx } = await authorizeRequest(eventsPolicy, "events.delete");
    return ok(
      await checkEventDelete(ctx, (await params).id, [
        taskEventLinks,
        expenseEventLinks,
      ]),
      {
        requestId,
        headers,
      },
    );
  } catch (err) {
    return errorResponse(err, { requestId, headers });
  }
}
