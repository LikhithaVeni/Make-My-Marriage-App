import { authorizeRequest } from "@/lib/session";
import { getEvent } from "@/modules/events";
import {
  findNearbyQuerySchema,
  findNearbyUrl,
  vendorsPolicy,
} from "@/modules/vendors";
import { AppError } from "@/platform/errors";
import { errorResponse, ok } from "@/platform/http";
import { createRequestId } from "@/platform/request-id";

const headers = { "Cache-Control": "no-store" };

/**
 * GET /api/v1/vendors/find-nearby?serviceType=&eventId=: a Google Maps
 * search URL for that service near the event's venue. No Google API is
 * called (PRD "Find nearby (free)").
 */
export async function GET(request: Request) {
  const requestId = createRequestId();
  try {
    const { ctx } = await authorizeRequest(vendorsPolicy, "vendors.list");
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const parsed = findNearbyQuerySchema.safeParse(params);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fields[String(issue.path[0] ?? "query")] ??= issue.message;
      }
      throw new AppError("VALIDATION_FAILED", 400, "Some fields are invalid.", {
        fields,
      });
    }
    const event = await getEvent(ctx, parsed.data.eventId);
    return ok(
      { url: findNearbyUrl(parsed.data.serviceType, event.venue) },
      { requestId, headers },
    );
  } catch (err) {
    return errorResponse(err, { requestId, headers });
  }
}
