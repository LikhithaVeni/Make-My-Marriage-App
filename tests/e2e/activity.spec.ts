import { expect, test } from "@playwright/test";

import { ownVisitor } from "./support/client-ip";
import { E2E_DB_URI } from "./support/e2e-db";
import { closeDb, seedInvite, seedOtherWedding } from "./support/invites";

// The activity log (PRD "Activity log"; API Design `GET /activity`;
// decision 77).
test.skip(!E2E_DB_URI, "needs MONGODB_TEST_URI");
test.afterAll(closeDb);

const csrf = { "X-Requested-With": "mmm" };

test("every change shows in Activity and on the dashboard, for all organisers", async ({
  page,
  playwright,
  baseURL,
}) => {
  test.setTimeout(150_000);
  const weddingId = await seedOtherWedding();
  const join = async (
    request: typeof page.request,
    role: "ADMIN" | "MANAGER",
    name: string,
  ) => {
    const email = `activity.${role.toLowerCase()}.e2e@example.com`;
    const token = await seedInvite({ email, role, weddingId, name });
    const res = await request.post(`/api/v1/auth/signup?invite=${token}`, {
      headers: { ...csrf, ...ownVisitor() },
      data: { name, email, password: "e2e-activity-password" },
    });
    expect(res.status()).toBe(201);
  };
  await join(page.request, "ADMIN", "Likhitha");
  const manager = await playwright.request.newContext({ baseURL });
  await join(manager, "MANAGER", "Priya");

  // Nothing yet besides joining.
  const event = await page.request.post("/api/v1/events", {
    headers: csrf,
    data: {
      name: "Sangeet",
      startAt: "2028-01-26T19:00:00+05:30",
      endAt: "2028-01-26T23:00:00+05:30",
      venue: { name: "Hall", address: "Road 12" },
    },
  });
  const eventId = (await event.json()).data.id as string;
  const task = await manager.post("/api/v1/tasks", {
    headers: csrf,
    data: { title: "Order return gifts", eventId },
  });
  const taskId = (await task.json()).data.id as string;
  await manager.patch(`/api/v1/tasks/${taskId}`, {
    headers: csrf,
    data: { status: "COMPLETED" },
  });

  // The Activity page: newest first, with who did it; rows open the record.
  await page.goto("/activity");
  await expect(
    page.getByText("Priya completed 'Order return gifts'"),
  ).toBeVisible();
  await expect(
    page.getByText("Likhitha added the event 'Sangeet'"),
  ).toBeVisible();
  await expect(page.getByText("Priya joined as a Manager")).toBeVisible();
  const rows = page.locator("main li");
  await expect(rows.first()).toContainText(
    "Priya completed 'Order return gifts'",
  );
  await page
    .getByRole("link", { name: /Priya completed 'Order return gifts'/ })
    .click();
  await expect(page).toHaveURL(new RegExp(`/tasks/${taskId}$`));

  // Filters: area and person.
  await page.goto("/activity?entityType=EVENT");
  await expect(
    page.getByText("Likhitha added the event 'Sangeet'"),
  ).toBeVisible();
  await expect(page.getByText(/Order return gifts/)).toBeHidden();
  await page.goto("/activity");
  await page.getByText("Filter by person, area and date").click();
  await page.getByLabel("Person").selectOption({ label: "Priya" });
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByText(/Priya completed/)).toBeVisible();
  await expect(page.getByText(/Likhitha added the event/)).toBeHidden();

  // The dashboard's Recent activity.
  await page.goto("/dashboard");
  const recent = page.getByRole("region", { name: "Recent activity" });
  await expect(
    recent.getByText("Priya completed 'Order return gifts'"),
  ).toBeVisible();
  await expect(recent.getByText("Comes with the activity log")).toBeHidden();

  // Managers see the log too (PRD); signed-out callers don't.
  const asManager = await manager.get("/api/v1/activity?entityType=TASK");
  expect(asManager.status()).toBe(200);
  expect(
    ((await asManager.json()).data as { summary: string }[]).map(
      (e) => e.summary,
    ),
  ).toEqual([
    "Priya completed 'Order return gifts'",
    "Priya added the task 'Order return gifts'",
  ]);
  const anon = await playwright.request.newContext({ baseURL });
  expect((await anon.get("/api/v1/activity")).status()).toBe(401);
  expect(
    (await page.request.get("/api/v1/activity?entityType=TODO")).status(),
  ).toBe(400);
  await anon.dispose();
  await manager.dispose();
});
