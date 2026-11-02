import { AppError } from "@/platform/errors";
import { errorResponse } from "@/platform/http";

// Placeholder for the job runner the external scheduler will call. Until it
// exists it answers 404, which is also how API Design v1 says the endpoint
// responds to a missing or wrong X-Job-Secret.
export function POST() {
  return errorResponse(new AppError("NOT_FOUND", 404, "Not found."));
}
