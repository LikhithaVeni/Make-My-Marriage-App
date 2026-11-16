import { authorizeRequest } from "@/lib/session";
import {
  deleteEvent,
  eventsPolicy,
  getEvent,
  updateEvent,
  updateEventSchema,
} from "@/modules/events";
import { errorResponse, noContent, ok } from "@/platform/http";
import { parseJsonBody, requireCsrfHeader } from "@/platform/request";
import { createRequestId } from "@/platform/request-id";

const headers = { "Cache-Control": "no-store" };

/** GET /api/v1/events/{id}: one event (Admin, Manager). */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/v1/events/[id]">,
) {
  const requestId = createRequestId();
  try {
    const { ctx } = await authorizeRequest(eventsPolicy, "events.view");
    return ok(await getEvent(ctx, (await params).id), { requestId, headers });
  } catch (err) {
    return errorResponse(err, { requestId, headers });
  }
}

/** PATCH /api/v1/events/{id}: edit details (Admin, Manager; livestream Admin only). */
export async function PATCH(
  request: Request,
  { params }: RouteContext<"/api/v1/events/[id]">,
) {
  const requestId = createRequestId();
  try {
    requireCsrfHeader(request);
    const { ctx } = await authorizeRequest(eventsPolicy, "events.update");
    const input = await parseJsonBody(request, updateEventSchema);
    return ok(await updateEvent(ctx, (await params).id, input), {
      requestId,
      headers,
    });
  } catch (err) {
    return errorResponse(err, { requestId, headers });
  }
}

/** DELETE /api/v1/events/{id}: delete (Admin), 204; 409 if items are active. */
export async function DELETE(
  request: Request,
  { params }: RouteContext<"/api/v1/events/[id]">,
) {
  const requestId = createRequestId();
  try {
    requireCsrfHeader(request);
    const { ctx } = await authorizeRequest(eventsPolicy, "events.delete");
    await deleteEvent(ctx, (await params).id);
    return noContent({ requestId, headers });
  } catch (err) {
    return errorResponse(err, { requestId, headers });
  }
}
