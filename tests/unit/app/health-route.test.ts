import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DbStatus } from "@/platform/db";

const db = vi.hoisted(() => ({ status: "up" as DbStatus }));
vi.mock("@/platform/db", () => ({ dbStatus: async () => db.status }));

const { GET } = await import("@/app/api/health/route");

describe("GET /api/health", () => {
  beforeEach(() => {
    db.status = "up";
  });

  it.each<[DbStatus, number]>([
    ["up", 200],
    ["not_configured", 200],
    ["down", 503],
  ])("returns %s as status %i", async (status, httpStatus) => {
    db.status = status;
    const response = await GET();

    expect(response.status).toBe(httpStatus);
    expect(await response.json()).toMatchObject({
      data: { status: "ok", db: status },
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
