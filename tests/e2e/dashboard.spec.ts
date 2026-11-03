import { expect, test } from "@playwright/test";

test("GET /dashboard renders every Phase 1 card", async ({ request }) => {
  const response = await request.get("/dashboard");

  expect(response.status()).toBe(200);
  const html = await response.text();
  for (const heading of [
    "days to go",
    "My tasks",
    "Upcoming events",
    "Pending payments",
    "Wedding-day contacts",
    "Recent activity",
  ]) {
    expect(html).toContain(heading);
  }
});

test("the checklist shows only for a new wedding", async ({ request }) => {
  const empty = await (await request.get("/dashboard?sample=empty")).text();
  expect(empty).toContain("Get started");
  expect(empty).toContain("Invite family members");

  const full = await (await request.get("/dashboard")).text();
  expect(full).not.toContain("Get started");
});
