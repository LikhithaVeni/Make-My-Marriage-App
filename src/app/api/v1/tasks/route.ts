import { authorizeRequest } from "@/lib/session";
import {
  createTask,
  createTaskSchema,
  listTasks,
  parseTaskQuery,
  tasksPolicy,
} from "@/modules/tasks";
import { AppError } from "@/platform/errors";
import { errorResponse, list, ok } from "@/platform/http";
import { parseJsonBody, requireCsrfHeader } from "@/platform/request";
import { createRequestId } from "@/platform/request-id";

const headers = { "Cache-Control": "no-store" };

/** GET /api/v1/tasks: the list with filters, sorts and paging (Admin, Manager). */
export async function GET(request: Request) {
  const requestId = createRequestId();
  try {
    const { ctx } = await authorizeRequest(tasksPolicy, "tasks.list");
    const parsed = parseTaskQuery(new URL(request.url).searchParams);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fields[String(issue.path[0] ?? "query")] ??= issue.message;
      }
      throw new AppError(
        "VALIDATION_FAILED",
        400,
        "Some filters are invalid.",
        {
          fields,
        },
      );
    }
    const page = await listTasks(ctx, parsed.data);
    return list(
      page.tasks,
      { nextCursor: page.nextCursor, limit: page.limit },
      { requestId, headers },
    );
  } catch (err) {
    return errorResponse(err, { requestId, headers });
  }
}

/** POST /api/v1/tasks: add a task (Admin, Manager), 201. */
export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    requireCsrfHeader(request);
    const { ctx } = await authorizeRequest(tasksPolicy, "tasks.create");
    const input = await parseJsonBody(request, createTaskSchema);
    return ok(await createTask(ctx, input), {
      requestId,
      headers,
      status: 201,
    });
  } catch (err) {
    return errorResponse(err, { requestId, headers });
  }
}
