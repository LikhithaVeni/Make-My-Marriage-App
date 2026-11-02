import { expect, test } from "@playwright/test";

test("GET /api/health returns the health envelope", async ({ request }) => {
  const response = await request.get("/api/health");

  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe(
    "application/json; charset=utf-8",
  );
  expect(response.headers()["x-request-id"]).toMatch(/^req_[0-9a-f]{24}$/);
  expect(await response.json()).toEqual({
    data: {
      status: "ok",
      version: expect.stringMatching(/^\d+\.\d+\.\d+/),
      db: expect.stringMatching(/^(up|down|not_configured)$/),
    },
  });
});
