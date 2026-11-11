import "server-only";

import { NextResponse } from "next/server";

import { toErrorResponse } from "@/platform/errors";
import { createRequestId, REQUEST_ID_HEADER } from "@/platform/request-id";

// Response helpers for the envelope in docs/API Design v1.md:
//   single: { data }   list: { data, page }   error: { error }

const JSON_CONTENT_TYPE = "application/json; charset=utf-8";

export interface Page {
  nextCursor: string | null;
  limit: number;
}

export interface ResponseOptions {
  requestId?: string;
  status?: number;
  headers?: HeadersInit;
}

function json(body: unknown, status: number, options: ResponseOptions) {
  const response = NextResponse.json(body, {
    status,
    headers: options.headers,
  });
  response.headers.set("Content-Type", JSON_CONTENT_TYPE);
  response.headers.set(
    REQUEST_ID_HEADER,
    options.requestId ?? createRequestId(),
  );
  return response;
}

export function ok<T>(data: T, options: ResponseOptions = {}) {
  return json({ data }, options.status ?? 200, options);
}

/** 204 with no body, e.g. after logging out. */
export function noContent(options: ResponseOptions = {}) {
  const response = new NextResponse(null, {
    status: 204,
    headers: options.headers,
  });
  response.headers.set(
    REQUEST_ID_HEADER,
    options.requestId ?? createRequestId(),
  );
  return response;
}

export function list<T>(data: T[], page: Page, options: ResponseOptions = {}) {
  return json({ data, page }, options.status ?? 200, options);
}

export function errorResponse(err: unknown, options: ResponseOptions = {}) {
  const requestId = options.requestId ?? createRequestId();
  const { status, body } = toErrorResponse(err, requestId);
  if (status >= 500) {
    console.error(`[${requestId}]`, err);
  }
  const response = json(body, status, { ...options, requestId });
  // 429 RATE_LIMITED and 423 ACCOUNT_LOCKED say how long to wait.
  const retryAfter = body.error.details?.retryAfterSeconds;
  if (typeof retryAfter === "number") {
    response.headers.set("Retry-After", String(retryAfter));
  }
  return response;
}
