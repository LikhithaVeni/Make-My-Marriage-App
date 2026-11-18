import { authorizeRequest } from "@/lib/session";
import {
  activityPolicy,
  listActivity,
  parseActivityQuery,
} from "@/modules/activity";
import { AppError } from "@/platform/errors";
import { errorResponse, list } from "@/platform/http";
import { createRequestId } from "@/platform/request-id";

const headers = { "Cache-Control": "no-store" };

/** GET /api/v1/activity: the activity log, newest first (Admin, Manager). */
export async function GET(request: Request) {
  const requestId = createRequestId();
  try {
    const { ctx } = await authorizeRequest(activityPolicy, "activity.list");
    const parsed = parseActivityQuery(new URL(request.url).searchParams);
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
    const page = await listActivity(ctx, parsed.data);
    return list(
      page.entries,
      { nextCursor: page.nextCursor, limit: page.limit },
      { requestId, headers },
    );
  } catch (err) {
    return errorResponse(err, { requestId, headers });
  }
}
