import { authorizeRequest } from "@/lib/session";
import { taskAssignees, tasksPolicy } from "@/modules/tasks";
import { errorResponse, ok } from "@/platform/http";
import { createRequestId } from "@/platform/request-id";

const headers = { "Cache-Control": "no-store" };

/** GET /api/v1/tasks/assignees: Admins' and Managers' names, for the picker. */
export async function GET() {
  const requestId = createRequestId();
  try {
    const { ctx } = await authorizeRequest(tasksPolicy, "tasks.create");
    return ok({ assignees: await taskAssignees(ctx) }, { requestId, headers });
  } catch (err) {
    return errorResponse(err, { requestId, headers });
  }
}
