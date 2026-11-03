import packageJson from "../../../../package.json";

import { dbStatus } from "@/platform/db";
import { errorResponse, ok } from "@/platform/http";
import { createRequestId } from "@/platform/request-id";

// 503 when MongoDB is configured but unreachable, so uptime monitors alert on
// the status code alone; 200 otherwise, including "not_configured" (see
// docs/decisions.md).
export async function GET() {
  const requestId = createRequestId();
  const headers = { "Cache-Control": "no-store" };
  try {
    const db = await dbStatus();
    return ok(
      { status: "ok", version: packageJson.version, db },
      { requestId, headers, status: db === "down" ? 503 : 200 },
    );
  } catch (err) {
    return errorResponse(err, { requestId, headers });
  }
}
