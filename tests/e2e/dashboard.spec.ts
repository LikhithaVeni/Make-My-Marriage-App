import { expect, test } from "@playwright/test";

import { ownVisitor } from "./support/client-ip";
import { E2E_DB_URI } from "./support/e2e-db";
import { closeDb, seedInvite, seedOtherWedding } from "./support/invites";
import { logIn } from "./support/login";

// The dashboard on real data (PRD "Dashboard"; API Design `GET /dashboard`;
// decision 73).
test.skip(!E2E_DB_URI, "needs MONGODB_TEST_URI for a seeded account");
test.afterAll(closeDb);

const csrf = { "X-Requested-With": "mmm" };

test("every card shows, and unbuilt ones say what they come with", async ({
  page,
}) => {
  await logIn(page.request);
  await page.goto("/dashboard");
  for (const heading of [
    "My tasks",
    "Upcoming events",
    "Pending payments",
    "Wedding-day contacts",
    "Recent activity",
  ]) {
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }
  await expect(page.getByText(/days to go/)).toBeVisible();
  await expect(page.getByText("Comes with the activity log")).toBeVisible();
  await expect(page.getByText("Comes with the guest list")).toBeVisible();
  // The signed-in wedding heads the menu.
  await expect(page.getByText("E2E weds Test").first()).toBeVisible();
});

test("a new wedding's dashboard fills in as events and tasks are added", async ({
  page,
  playwright,
  baseURL,
}) => {
  test.setTimeout(120_000);
  const weddingId = await seedOtherWedding();
  const email = "dashboard.admin.e2e@example.com";
  const token = await seedInvite({ email, role: "ADMIN", weddingId });
  const signedUp = await page.request.post(
    `/api/v1/auth/signup?invite=${token}`,
    {
      headers: { ...csrf, ...ownVisitor() },
      data: { name: "Dash Admin", email, password: "e2e-dashboard-password" },
    },
  );
  expect(signedUp.status()).toBe(201);
  const adminId = (await signedUp.json()).data.user.id as string;

  // Brand new: the checklist offers its first steps; nothing to list yet.
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "Get started" }),
  ).toBeVisible();
  await expect(page.getByText("0 of 4 done")).toBeVisible();
  await expect(page.getByText("No tasks assigned to you")).toBeVisible();
  await expect(page.getByText("No upcoming events")).toBeVisible();

  // Add an event and an overdue task for the Admin.
  const event = await page.request.post("/api/v1/events", {
    headers: csrf,
    data: {
      name: "Sangeet",
      startAt: "2028-01-26T19:00:00+05:30",
      endAt: "2028-01-27T01:00:00+05:30",
      venue: { name: "Grand Hall", address: "Road 12" },
      dressCode: "Indo-western",
    },
  });
  const eventId = (await event.json()).data.id as string;
  const task = await page.request.post("/api/v1/tasks", {
    headers: csrf,
    data: {
      title: "Book the DJ",
      assigneeId: adminId,
      eventId,
      dueDate: "2020-01-10",
      priority: "HIGH",
    },
  });
  const taskId = (await task.json()).data.id as string;

  await page.reload();
  await expect(page.getByText("2 of 4 done")).toBeVisible();
  const myTasks = page.getByRole("region", { name: "My tasks" });
  await expect(myTasks.getByText("Book the DJ")).toBeVisible();
  await expect(myTasks.getByText("Overdue · 10 Jan")).toBeVisible();
  await expect(myTasks.getByText("1 overdue")).toBeVisible();
  const upcoming = page.getByRole("region", { name: "Upcoming events" });
  await expect(upcoming.getByText("Sangeet")).toBeVisible();
  await expect(
    upcoming.getByText(/7:00 PM – 1:00 AM \(next day\) · Grand Hall/),
  ).toBeVisible();

  // Rows open the task and the event.
  await myTasks.getByRole("link", { name: /Book the DJ/ }).click();
  await expect(page).toHaveURL(new RegExp(`/tasks/${taskId}$`));
  await page.goto("/dashboard");
  await upcoming.getByRole("link", { name: /Sangeet/ }).click();
  await expect(page).toHaveURL(new RegExp(`/events/${eventId}$`));

  // The API returns the same data; unbuilt parts are null.
  const api = await page.request.get("/api/v1/dashboard");
  expect(api.status()).toBe(200);
  const data = (await api.json()).data;
  expect(data).toMatchObject({
    tasks: { todo: 1, inProgress: 0, completed: 0, overdue: 1 },
    totals: { members: 1, events: 1, vendors: 0, households: null },
    money: { spentPaise: 0, pendingPaise: 0, pendingPayments: [] },
    weddingDayContacts: [],
    recentActivity: null,
  });
  const anon = await playwright.request.newContext({ baseURL });
  expect((await anon.get("/api/v1/dashboard")).status()).toBe(401);
  await anon.dispose();
});
