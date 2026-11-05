import type { NextRequest } from "next/server";

import { readSession } from "@/lib/session";
import { checkSlug, slugSchema } from "@/modules/wedding";
import { AppError } from "@/platform/errors";
import { errorResponse, ok } from "@/platform/http";
import { createRequestId } from "@/platform/request-id";

const headers = { "Cache-Control": "no-store" };

/** GET /api/v1/wedding/slug-available?slug=: check a web address while typing. */
export async function GET(request: NextRequest) {
  const requestId = createRequestId();
  try {
    if (!(await readSession())) {
      throw new AppError("UNAUTHENTICATED", 401, "Please log in to continue.");
    }
    const parsed = slugSchema.safeParse(
      request.nextUrl.searchParams.get("slug") ?? "",
    );
    if (!parsed.success) {
      throw new AppError("VALIDATION_FAILED", 400, "Some fields are invalid.", {
        fields: { slug: parsed.error.issues[0]?.message ?? "Invalid" },
      });
    }
    return ok(await checkSlug(parsed.data), { requestId, headers });
  } catch (err) {
    return errorResponse(err, { requestId, headers });
  }
}
