import { randomBytes } from "node:crypto";

export const REQUEST_ID_HEADER = "X-Request-Id";

/** A per-request id, e.g. "req_9f3a…", returned to the client and written to logs. */
export function createRequestId(): string {
  return `req_${randomBytes(12).toString("hex")}`;
}
