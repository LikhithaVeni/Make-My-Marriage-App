import { authorizeRequest } from "@/lib/session";
import {
  createEvent,
  createEventSchema,
  eventsPolicy,
  listEvents,
} from "@/modules/events";
import { errorResponse, list, ok } from "@/platform/http";
import { parseJsonBody, requireCsrfHeader } from "@/platform/request";
import { createRequestId } from "@/platform/request-id";

const headers = { "Cache-Control": "no-store" };

/** GET /api/v1/events: the schedule, earliest first (Admin, Manager, photographer). */
export async function GET() {
  const requestId = createRequestId();
  try {
    const { ctx } = await authorizeRequest(eventsPolicy, "events.list");
    const events = await listEvents(ctx);
    // Every event in one page: a wedding has about ten (Database Design).
    return list(
      events,
      { nextCursor: null, limit: events.length },
      { requestId, headers },
    );
  } catch (err) {
    return errorResponse(err, { requestId, headers });
  }
}

/** POST /api/v1/events: add an event (Admin), 201. */
export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    requireCsrfHeader(request);
    const { ctx } = await authorizeRequest(eventsPolicy, "events.create");
    const input = await parseJsonBody(request, createEventSchema);
    return ok(await createEvent(ctx, input), {
      requestId,
      headers,
      status: 201,
    });
  } catch (err) {
    return errorResponse(err, { requestId, headers });
  }
}
