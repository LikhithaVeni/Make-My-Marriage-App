// Error codes from docs/API Design v1.md ("Error format and codes"), plus
// SERVICE_NOT_CONFIGURED (see docs/decisions.md). The UI switches on `code`,
// never on `message`.
export type ErrorCode =
  | "VALIDATION_FAILED"
  | "COUNT_EXCEEDS_ALLOWED"
  | "UNAUTHENTICATED"
  | "INVALID_CREDENTIALS"
  | "PRO_ACCESS_REQUIRED"
  | "PRO_PASSWORD_INVALID"
  | "FORBIDDEN"
  | "NO_WEDDING"
  | "EMAIL_NOT_VERIFIED"
  | "EVENT_NOT_INVITED"
  | "NOT_OWN_PHOTO"
  | "NOT_FOUND"
  | "EMAIL_TAKEN"
  | "SLUG_TAKEN"
  | "PHONE_EXISTS"
  | "ALREADY_IN_WEDDING"
  | "EMAIL_IN_OTHER_WEDDING"
  | "LAST_ADMIN"
  | "EVENT_HAS_ACTIVE_ITEMS"
  | "RSVP_CLOSED"
  | "REMINDER_TOO_SOON"
  | "UPLOAD_CAP_REACHED"
  | "UPLOAD_NOT_FOUND_IN_STORAGE"
  | "TOKEN_EXPIRED"
  | "TOKEN_USED"
  | "FILE_TOO_LARGE"
  | "UNSUPPORTED_FILE_TYPE"
  | "ACCOUNT_LOCKED"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "SERVICE_NOT_CONFIGURED";

export type ErrorDetails = Record<string, unknown>;

export interface ErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    details: ErrorDetails | null;
    requestId: string;
  };
}

/** An expected failure whose code, status and message are safe to show. */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number;
  readonly details: ErrorDetails | null;

  constructor(
    code: ErrorCode,
    httpStatus: number,
    message: string,
    details?: ErrorDetails,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details ?? null;
  }
}

export const INTERNAL_ERROR_MESSAGE = "Something went wrong. Please try again.";

/**
 * Maps any thrown value to the API error envelope. Anything that is not an
 * AppError becomes INTERNAL_ERROR with a generic message, so internal details
 * never reach the client; they belong in the logs only.
 */
export function toErrorResponse(
  err: unknown,
  requestId: string,
): { status: number; body: ErrorBody } {
  if (err instanceof AppError) {
    return {
      status: err.httpStatus,
      body: {
        error: {
          code: err.code,
          message: err.message,
          details: err.details,
          requestId,
        },
      },
    };
  }

  return {
    status: 500,
    body: {
      error: {
        code: "INTERNAL_ERROR",
        message: INTERNAL_ERROR_MESSAGE,
        details: null,
        requestId,
      },
    },
  };
}
