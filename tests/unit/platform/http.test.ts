import { afterEach, describe, expect, it, vi } from "vitest";

import { AppError, INTERNAL_ERROR_MESSAGE } from "@/platform/errors";
import { errorResponse, list, ok } from "@/platform/http";

const requestId = "req_test";

function expectApiHeaders(response: Response, id = requestId) {
  expect(response.headers.get("content-type")).toBe(
    "application/json; charset=utf-8",
  );
  expect(response.headers.get("x-request-id")).toBe(id);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ok", () => {
  it("wraps a single resource in { data } with status 200", async () => {
    const response = ok({ id: "66b0", title: "Book caterer" }, { requestId });

    expect(response.status).toBe(200);
    expectApiHeaders(response);
    expect(await response.json()).toEqual({
      data: { id: "66b0", title: "Book caterer" },
    });
  });

  it("uses a custom status and keeps extra headers", () => {
    const response = ok(
      { id: "66b0" },
      { requestId, status: 201, headers: { "Cache-Control": "no-store" } },
    );

    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expectApiHeaders(response);
  });

  it("creates a request id when none is given", () => {
    const response = ok({});

    expect(response.headers.get("x-request-id")).toMatch(/^req_[0-9a-f]{24}$/);
  });
});

describe("list", () => {
  it("returns { data, page } with the cursor and limit", async () => {
    const response = list(
      [{ id: "1" }, { id: "2" }],
      { nextCursor: "eyJpZCI6IjIifQ", limit: 50 },
      { requestId },
    );

    expect(response.status).toBe(200);
    expectApiHeaders(response);
    expect(await response.json()).toEqual({
      data: [{ id: "1" }, { id: "2" }],
      page: { nextCursor: "eyJpZCI6IjIifQ", limit: 50 },
    });
  });

  it("returns a null cursor on the last page", async () => {
    const body = await list([], { nextCursor: null, limit: 50 }).json();

    expect(body).toEqual({ data: [], page: { nextCursor: null, limit: 50 } });
  });
});

describe("errorResponse", () => {
  it("returns the error envelope with the AppError's status", async () => {
    const response = errorResponse(
      new AppError("VALIDATION_FAILED", 400, "Some fields are invalid.", {
        fields: { endAt: "Must be after the start time" },
      }),
      { requestId },
    );

    expect(response.status).toBe(400);
    expectApiHeaders(response);
    expect(await response.json()).toEqual({
      error: {
        code: "VALIDATION_FAILED",
        message: "Some fields are invalid.",
        details: { fields: { endAt: "Must be after the start time" } },
        requestId,
      },
    });
  });

  it("does not log expected errors", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    errorResponse(new AppError("NOT_FOUND", 404, "Not found."), { requestId });

    expect(log).not.toHaveBeenCalled();
  });

  it("hides unexpected errors behind INTERNAL_ERROR and logs them with the request id", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const err = new Error("connection string mongodb://user:secret@host");

    const response = errorResponse(err, { requestId });

    expect(response.status).toBe(500);
    expectApiHeaders(response);
    expect(await response.json()).toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: INTERNAL_ERROR_MESSAGE,
        details: null,
        requestId,
      },
    });
    expect(log).toHaveBeenCalledWith(`[${requestId}]`, err);
  });

  it("uses the same request id in the header and the body", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = errorResponse(new Error("boom"));
    const body = (await response.json()) as { error: { requestId: string } };

    expect(response.headers.get("x-request-id")).toBe(body.error.requestId);
  });
});
