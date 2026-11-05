import type { ErrorCode } from "@/platform/errors";

// Browser-side calls to our own API (docs/API Design v1.md): JSON in and out,
// the `{ data }` / `{ error }` envelope, and the X-Requested-With header that
// System Design requires on every mutation as a CSRF guard.

export type ApiErrorCode = ErrorCode | "NETWORK_ERROR";

/** A failed API call, carrying the server's error code for the UI to switch on. */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details: Record<string, unknown> | null;

  constructor(
    code: ApiErrorCode,
    message: string,
    status: number,
    details: Record<string, unknown> | null = null,
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

interface ErrorPayload {
  error?: {
    code?: ErrorCode;
    message?: string;
    details?: Record<string, unknown> | null;
  };
}

/** POSTs JSON and returns the response's `data`, or throws an ApiError. */
export async function postJson<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "fetch",
      },
      body: JSON.stringify(body),
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError(
      "NETWORK_ERROR",
      "Couldn't reach the server. Check your connection and try again.",
      0,
    );
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = (payload as ErrorPayload | null)?.error;
    if (error?.code) {
      throw new ApiError(
        error.code,
        error.message ?? "Something went wrong.",
        response.status,
        error.details ?? null,
      );
    }
    // No envelope, e.g. a route that doesn't exist yet.
    throw new ApiError(
      response.status === 404 ? "NOT_FOUND" : "INTERNAL_ERROR",
      "Something went wrong. Please try again.",
      response.status,
    );
  }
  return (payload as { data: T }).data;
}
