import { expect, test } from "@playwright/test";

import { ownVisitor } from "./support/client-ip";
import { E2E_DB_URI } from "./support/e2e-db";
import { closeDb, seedInvite, seedOtherWedding } from "./support/invites";

// Every name at its longest, with no spaces, must wrap or shorten instead
// of widening a page (design system: works from 360 px). QA kept finding
// one more place where it didn't (decisions 75 and 77).
test.skip(!E2E_DB_URI, "needs MONGODB_TEST_URI");
test.afterAll(closeDb);

const csrf = { "X-Requested-With": "mmm" };

test("no page scrolls sideways, even with the longest names", async ({
  page,
}) => {
  test.setTimeout(150_000);
  const weddingId = await seedOtherWedding();
  const email = "long.names.e2e@example.com";
  const token = await seedInvite({ email, role: "ADMIN", weddingId });
  const signedUp = await page.request.post(
    `/api/v1/auth/signup?invite=${token}`,
    {
      headers: { ...csrf, ...ownVisitor() },
      data: { name: "N".repeat(80), email, password: "e2e-long-password" },
    },
  );
  const me = (await signedUp.json()).data.user.id as string;
  const post = async (path: string, data: object) =>
    (await (await page.request.post(path, { headers: csrf, data })).json()).data
      .id as string;

  const eventId = await post("/api/v1/events", {
    name: "E".repeat(80),
    startAt: "2028-01-26T19:00:00+05:30",
    endAt: "2028-01-27T03:00:00+05:30",
    venue: { name: "V".repeat(200), address: "A".repeat(500) },
    dressCode: "D".repeat(200),
  });
  const taskId = await post("/api/v1/tasks", {
    title: "T".repeat(200),
    assigneeId: me,
    eventId,
    dueDate: "2020-01-01",
  });
  const vendorId = await post("/api/v1/vendors", {
    name: "W".repeat(80),
    serviceType: "S".repeat(80),
    phone: "98765 11111",
    weddingDayContact: true,
    agreedPaise: 9_99_99_999_99,
  });
  const expenseId = await post("/api/v1/expenses", {
    amountPaise: 9_99_99_999_99,
    date: "2027-10-02",
    eventId,
    vendorId,
    category: "DECOR",
    paidBy: "P".repeat(80),
    status: "PENDING",
    dueDate: "2020-01-01",
    description: "X".repeat(300),
  });

  const pages = [
    "/dashboard",
    "/events",
    `/events/${eventId}`,
    "/tasks",
    `/tasks/${taskId}`,
    "/expenses",
    `/expenses/${expenseId}`,
    "/vendors",
    `/vendors/${vendorId}`,
    "/vendors/contacts",
    "/activity",
  ];
  await page.setViewportSize({ width: 360, height: 800 });
  for (const path of pages) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect.soft(overflow, path).toBe(0);
  }
});
