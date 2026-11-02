import packageJson from "../../../../package.json";

import { dbStatus } from "@/platform/db";
import { errorResponse, ok } from "@/platform/http";
import { createRequestId } from "@/platform/request-id";

// Always 200 while the app is running; the database state is reported in `db`
// (see docs/decisions.md). Monitors must read `data.db`, not the status code.
export async function GET() {
  const requestId = createRequestId();
  const headers = { "Cache-Control": "no-store" };
  try {
    const db = await dbStatus();
    return ok(
      { status: "ok", version: packageJson.version, db },
      { requestId, headers },
    );
  } catch (err) {
    return errorResponse(err, { requestId, headers });
  }
}
