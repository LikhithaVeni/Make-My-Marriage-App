import { authorizeRequest } from "@/lib/session";
import {
  listExpenses,
  listExpensesQuerySchema,
  paidByVendor,
  unlinkVendorExpenses,
} from "@/modules/expenses";
import {
  deleteVendor,
  getVendor,
  updateVendor,
  updateVendorSchema,
  vendorsPolicy,
} from "@/modules/vendors";
import { errorResponse, noContent, ok } from "@/platform/http";
import { parseJsonBody, requireCsrfHeader } from "@/platform/request";
import { createRequestId } from "@/platform/request-id";

const headers = { "Cache-Control": "no-store" };

/** GET /api/v1/vendors/{id}: the vendor with its linked expenses (Admin, Manager). */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/v1/vendors/[id]">,
) {
  const requestId = createRequestId();
  try {
    const { ctx } = await authorizeRequest(vendorsPolicy, "vendors.view");
    const { id } = await params;
    const vendor = await getVendor(ctx, id, await paidByVendor(ctx));
    const { expenses } = await listExpenses(
      ctx,
      listExpensesQuerySchema.parse({ vendorId: id, limit: 100 }),
    );
    return ok({ ...vendor, expenses }, { requestId, headers });
  } catch (err) {
    return errorResponse(err, { requestId, headers });
  }
}

/** PATCH /api/v1/vendors/{id}: edit or change booking status (Admin, Manager). */
export async function PATCH(
  request: Request,
  { params }: RouteContext<"/api/v1/vendors/[id]">,
) {
  const requestId = createRequestId();
  try {
    requireCsrfHeader(request);
    const { ctx } = await authorizeRequest(vendorsPolicy, "vendors.update");
    const input = await parseJsonBody(request, updateVendorSchema);
    return ok(
      await updateVendor(
        ctx,
        (await params).id,
        input,
        await paidByVendor(ctx),
      ),
      { requestId, headers },
    );
  } catch (err) {
    return errorResponse(err, { requestId, headers });
  }
}

/** DELETE /api/v1/vendors/{id}: delete; expenses keep their data (Admin, Manager), 204. */
export async function DELETE(
  request: Request,
  { params }: RouteContext<"/api/v1/vendors/[id]">,
) {
  const requestId = createRequestId();
  try {
    requireCsrfHeader(request);
    const { ctx } = await authorizeRequest(vendorsPolicy, "vendors.delete");
    await deleteVendor(ctx, (await params).id, unlinkVendorExpenses);
    return noContent({ requestId, headers });
  } catch (err) {
    return errorResponse(err, { requestId, headers });
  }
}
