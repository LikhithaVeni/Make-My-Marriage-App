import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { enforceRateLimit } from "@/platform/rate-limit";

import { startTestDb, TEST_DB_URI } from "../helpers/test-db";

let db: Awaited<ReturnType<typeof startTestDb>> | undefined;

beforeAll(async () => {
  if (!TEST_DB_URI) return;
  db = await startTestDb("rate_limit");
}, 120_000);

afterAll(async () => {
  await db?.stop();
});

const rule = { limit: 3, windowMs: 60_000 };
const start = new Date("2026-11-05T10:00:00Z");
const later = (ms: number) => new Date(start.getTime() + ms);

describe.skipIf(!TEST_DB_URI)("enforceRateLimit with MongoDB", () => {
  it("allows the limit, then rejects until the window ends", async () => {
    const key = "login:ip:203.0.113.1";
    for (let i = 0; i < 3; i++) {
      await enforceRateLimit(key, rule, { now: later(i * 1000) });
    }

    await expect(
      enforceRateLimit(key, rule, { now: later(20_000) }),
    ).rejects.toMatchObject({
      code: "RATE_LIMITED",
      details: { retryAfterSeconds: 40 },
    });

    // A new window starts once the first one has ended.
    await expect(
      enforceRateLimit(key, rule, { now: later(60_001) }),
    ).resolves.toBeUndefined();
  });

  it("counts each key separately", async () => {
    for (let i = 0; i < 3; i++) {
      await enforceRateLimit("signup:ip:203.0.113.2", rule, { now: start });
    }
    await expect(
      enforceRateLimit("signup:ip:203.0.113.3", rule, { now: start }),
    ).resolves.toBeUndefined();
  });

  it("counts requests arriving at the same moment once each", async () => {
    const key = "login:ip:203.0.113.4";
    const results = await Promise.allSettled(
      Array.from({ length: 6 }, () =>
        enforceRateLimit(key, rule, { now: start }),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(3);
  });
});
