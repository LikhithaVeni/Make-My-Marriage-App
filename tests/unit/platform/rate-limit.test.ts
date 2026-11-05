import { describe, expect, it } from "vitest";

import { AppError } from "@/platform/errors";
import {
  AUTH_RATE_LIMIT,
  clientIp,
  enforceRateLimit,
  type HitCounter,
} from "@/platform/rate-limit";

const now = new Date("2026-11-05T10:00:00Z");

/** Pretends the counter already holds `count` hits, ending 90 seconds from now. */
function counterAt(count: number): HitCounter {
  return async () => ({
    count,
    windowEndsAt: new Date(now.getTime() + 90_000),
  });
}

describe("enforceRateLimit", () => {
  it("lets requests through up to the limit", async () => {
    await expect(
      enforceRateLimit("login:ip:1.2.3.4", AUTH_RATE_LIMIT, {
        now,
        count: counterAt(10),
      }),
    ).resolves.toBeUndefined();
  });

  it("throws 429 RATE_LIMITED with seconds to wait once over the limit", async () => {
    const result = enforceRateLimit("login:ip:1.2.3.4", AUTH_RATE_LIMIT, {
      now,
      count: counterAt(11),
    });
    await expect(result).rejects.toBeInstanceOf(AppError);
    await expect(result).rejects.toMatchObject({
      code: "RATE_LIMITED",
      httpStatus: 429,
      details: { retryAfterSeconds: 90 },
    });
  });

  it("passes the key and window to the counter", async () => {
    const calls: unknown[] = [];
    await enforceRateLimit("signup:ip:1.2.3.4", AUTH_RATE_LIMIT, {
      now,
      count: async (...args) => {
        calls.push(args);
        return { count: 1, windowEndsAt: now };
      },
    });
    expect(calls).toEqual([["signup:ip:1.2.3.4", 15 * 60_000, now]]);
  });
});

describe("clientIp", () => {
  it("takes the first X-Forwarded-For address", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.7, 10.0.0.1",
    });
    expect(clientIp(headers)).toBe("203.0.113.7");
  });

  it("falls back to X-Real-IP, then to unknown", () => {
    expect(clientIp(new Headers({ "x-real-ip": "203.0.113.8" }))).toBe(
      "203.0.113.8",
    );
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
