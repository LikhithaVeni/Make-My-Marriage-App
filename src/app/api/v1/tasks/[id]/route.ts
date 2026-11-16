import { authorizeRequest } from "@/lib/session";
import {
  deleteTask,
  getTask,
  tasksPolicy,
  updateTask,
  updateTaskSchema,
} from "@/modules/tasks";
import { errorResponse, noContent, ok } from "@/platform/http";
import { parseJsonBody, requireCsrfHeader } from "@/platform/request";
import { createRequestId } from "@/platform/request-id";

const headers = { "Cache-Control": "no-store" };

/** GET /api/v1/tasks/{id}: one task (Admin, Manager). */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/v1/tasks/[id]">,
) {
  const requestId = createRequestId();
  try {
    const { ctx } = await authorizeRequest(tasksPolicy, "tasks.view");
    return ok(await getTask(ctx, (await params).id), { requestId, headers });
  } catch (err) {
    return errorResponse(err, { requestId, headers });
  }
}

/** PATCH /api/v1/tasks/{id}: edit, reassign or change status (Admin, Manager). */
export async function PATCH(
  request: Request,
  { params }: RouteContext<"/api/v1/tasks/[id]">,
) {
  const requestId = createRequestId();
  try {
    requireCsrfHeader(request);
    const { ctx } = await authorizeRequest(tasksPolicy, "tasks.update");
    const input = await parseJsonBody(request, updateTaskSchema);
    return ok(await updateTask(ctx, (await params).id, input), {
      requestId,
      headers,
    });
  } catch (err) {
    return errorResponse(err, { requestId, headers });
  }
}

/** DELETE /api/v1/tasks/{id}: delete (Admin, Manager), 204. */
export async function DELETE(
  request: Request,
  { params }: RouteContext<"/api/v1/tasks/[id]">,
) {
  const requestId = createRequestId();
  try {
    requireCsrfHeader(request);
    const { ctx } = await authorizeRequest(tasksPolicy, "tasks.delete");
    await deleteTask(ctx, (await params).id);
    return noContent({ requestId, headers });
  } catch (err) {
    return errorResponse(err, { requestId, headers });
  }
}
