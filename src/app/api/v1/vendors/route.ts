import { authorizeRequest } from "@/lib/session";
import { paidByVendor } from "@/modules/expenses";
import {
  createVendor,
  createVendorSchema,
  listVendors,
  parseVendorQuery,
  vendorsPolicy,
} from "@/modules/vendors";
import { AppError } from "@/platform/errors";
import { errorResponse, list, ok } from "@/platform/http";
import { parseJsonBody, requireCsrfHeader } from "@/platform/request";
import { createRequestId } from "@/platform/request-id";

const headers = { "Cache-Control": "no-store" };

/** GET /api/v1/vendors: every vendor with what's been paid (Admin, Manager). */
export async function GET(request: Request) {
  const requestId = createRequestId();
  try {
    const { ctx } = await authorizeRequest(vendorsPolicy, "vendors.list");
    const parsed = parseVendorQuery(new URL(request.url).searchParams);
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
    // Paid totals come from expenses (decision 75).
    const vendors = await listVendors(
      ctx,
      parsed.data,
      await paidByVendor(ctx),
    );
    return list(
      vendors,
      { nextCursor: null, limit: vendors.length },
      { requestId, headers },
    );
  } catch (err) {
    return errorResponse(err, { requestId, headers });
  }
}

/** POST /api/v1/vendors: save a vendor (Admin, Manager), 201. */
export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    requireCsrfHeader(request);
    const { ctx } = await authorizeRequest(vendorsPolicy, "vendors.create");
    const input = await parseJsonBody(request, createVendorSchema);
    return ok(await createVendor(ctx, input), {
      requestId,
      headers,
      status: 201,
    });
  } catch (err) {
    return errorResponse(err, { requestId, headers });
  }
}
