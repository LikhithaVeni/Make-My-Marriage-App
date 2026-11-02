import { describe, expect, it } from "vitest";

import {
  AppError,
  INTERNAL_ERROR_MESSAGE,
  toErrorResponse,
} from "@/platform/errors";

const requestId = "req_test";

describe("toErrorResponse", () => {
  it("maps an AppError to the API error envelope", () => {
    const err = new AppError("NOT_FOUND", 404, "Guest not found.");

    expect(toErrorResponse(err, requestId)).toEqual({
      status: 404,
      body: {
        error: {
          code: "NOT_FOUND",
          message: "Guest not found.",
          details: null,
          requestId,
        },
      },
    });
  });

  it("keeps details when they are given", () => {
    const details = { fields: { endAt: "Must be after the start time" } };
    const err = new AppError(
      "VALIDATION_FAILED",
      400,
      "Some fields are invalid.",
      details,
    );

    expect(toErrorResponse(err, requestId).body.error.details).toEqual(details);
  });

  it("turns an unknown error into INTERNAL_ERROR without leaking its message", () => {
    const { status, body } = toErrorResponse(
      new Error("connection string mongodb://user:secret@host"),
      requestId,
    );

    expect(status).toBe(500);
    expect(body).toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: INTERNAL_ERROR_MESSAGE,
        details: null,
        requestId,
      },
    });
  });

  it("handles thrown values that are not Error objects", () => {
    expect(toErrorResponse("boom", requestId).body.error.code).toBe(
      "INTERNAL_ERROR",
    );
  });
});
