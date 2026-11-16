import { expect, test } from "@playwright/test";

import { ownVisitor } from "./support/client-ip";
import { E2E_DB_URI } from "./support/e2e-db";
import { closeDb, seedInvite, seedOtherWedding } from "./support/invites";

// Tasks (PRD "Tasks", key flow F3; API Design "Tasks"; decision 71). The test
// makes its own wedding, so its tasks never reach other tests.
test.skip(!E2E_DB_URI, "needs MONGODB_TEST_URI");
test.afterAll(closeDb);

const csrf = { "X-Requested-With": "mmm" };
const PASSWORD = "e2e-tasks-password";

test("organisers plan tasks per event, move them along and see My tasks", async ({
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
    const email = `tasks.${role.toLowerCase()}.e2e@example.com`;
    const token = await seedInvite({ email, role, weddingId, name });
    const response = await request.post(`/api/v1/auth/signup?invite=${token}`, {
      headers: { ...csrf, ...ownVisitor() },
      data: { name, email, password: PASSWORD },
    });
    expect(response.status()).toBe(201);
    return (await response.json()).data.user.id as string;
  };
  await join(page.request, "ADMIN", "Tasks Admin");
  const manager = await playwright.request.newContext({ baseURL });
  const managerId = await join(manager, "MANAGER", "Priya");

  const sangeet = await page.request.post("/api/v1/events", {
    headers: csrf,
    data: {
      name: "Sangeet",
      startAt: "2028-01-26T19:00:00+05:30",
      endAt: "2028-01-26T23:00:00+05:30",
      venue: { name: "Hall", address: "Road 12" },
    },
  });
  const sangeetId = (await sangeet.json()).data.id as string;

  // No tasks yet; adding one from the event's page picks that event.
  await page.goto("/tasks");
  await expect(page.getByText("No tasks yet")).toBeVisible();
  await page.goto(`/events/${sangeetId}`);
  await expect(page.getByText("No tasks for Sangeet yet")).toBeVisible();
  await page.getByRole("link", { name: "Add task" }).click();
  await expect(page.getByLabel("Event")).toHaveValue(sangeetId);

  // A title is needed.
  const add = page.getByRole("button", { name: "Add task" });
  await add.click();
  await expect(page.getByText("Enter what needs doing")).toBeVisible();

  await page.getByLabel("What needs doing").fill("Book the DJ");
  await page.getByLabel("Assigned to").selectOption(managerId);
  await page.getByLabel("Due date (optional)").fill("2020-01-15");
  await page.getByLabel("Priority").selectOption("HIGH");
  await page.getByLabel("Notes (optional)").fill("Ask for a quote first");
  await add.click();

  // The task's page: overdue (the date has passed), Priya, Sangeet, High.
  await expect(page).toHaveURL(/\/tasks\/[0-9a-f]{24}$/, {
    timeout: 20_000,
  });
  const taskUrl = page.url();
  await expect(
    page.getByRole("heading", { name: "Book the DJ" }),
  ).toBeVisible();
  await expect(page.getByText("15 January 2020 · Overdue")).toBeVisible();
  await expect(page.getByText("Priya")).toBeVisible();
  await expect(page.getByRole("link", { name: "Sangeet" })).toBeVisible();
  await expect(page.getByText("Ask for a quote first")).toBeVisible();

  // To Do → In Progress in one tap.
  const status = page.getByRole("group", { name: "Status" });
  await expect(status.getByRole("button", { name: "To Do" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await status.getByRole("button", { name: "In Progress" }).click();
  await expect(
    status.getByRole("button", { name: "In Progress" }),
  ).toHaveAttribute("aria-pressed", "true");

  // A task in progress blocks deleting its event (PRD "Events").
  await page.goto(`/events/${sangeetId}`);
  await expect(page.getByText("0 of 1 completed")).toBeVisible();
  await page.getByRole("button", { name: "Delete event" }).click();
  await expect(page.getByText("Sangeet can't be deleted yet")).toBeVisible();
  await expect(page.getByText("Task in progress: Book the DJ")).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();

  // The Manager sees it in My tasks, and completes it.
  const mine = await manager.get("/api/v1/tasks?assigneeId=me");
  expect(
    ((await mine.json()).data as { title: string }[]).map((t) => t.title),
  ).toEqual(["Book the DJ"]);
  const taskId = taskUrl.split("/").pop()!;
  const completed = await manager.patch(`/api/v1/tasks/${taskId}`, {
    headers: csrf,
    data: { status: "COMPLETED" },
  });
  expect(completed.status()).toBe(200);
  expect((await completed.json()).data).toMatchObject({
    status: "COMPLETED",
    overdue: false,
  });

  // The list: a general task, the views and a search.
  const general = await page.request.post("/api/v1/tasks", {
    headers: csrf,
    data: { title: "Order sweets", dueDate: "2020-02-01" },
  });
  expect(general.status()).toBe(201);
  await page.goto("/tasks");
  const views = page.getByRole("navigation", { name: "Task views" });
  await expect(page.getByText("Book the DJ")).toBeVisible();
  await expect(page.getByText("Order sweets")).toBeVisible();
  await views.getByRole("link", { name: "Overdue" }).click();
  await expect(page.getByText("Order sweets")).toBeVisible();
  await expect(page.getByText("Book the DJ")).toBeHidden();
  await views.getByRole("link", { name: "My tasks" }).click();
  await expect(page.getByText("No tasks match")).toBeVisible();
  await page.goto("/tasks?q=dj");
  await expect(page.getByText("Book the DJ")).toBeVisible();
  await expect(page.getByText("Order sweets")).toBeHidden();

  // Edit: the Manager's completion shows; reopening clears it.
  await page.goto(taskUrl);
  await expect(page.getByText(/Completed on/)).toBeVisible();
  await page.getByRole("link", { name: "Edit" }).click();
  await expect(page.getByRole("combobox", { name: "Status" })).toHaveValue(
    "COMPLETED",
  );
  await page.getByLabel("What needs doing").fill("Book the DJ and lights");
  await page.getByRole("combobox", { name: "Status" }).selectOption("TODO");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(taskUrl);
  await expect(
    page.getByRole("heading", { name: "Book the DJ and lights" }),
  ).toBeVisible();
  await expect(page.getByText(/Completed on/)).toBeHidden();

  // Removing Priya leaves her task unassigned (PRD "Rules").
  const removed = await page.request.delete(`/api/v1/members/${managerId}`, {
    headers: csrf,
  });
  expect(removed.status()).toBe(204);
  await page.reload();
  await expect(page.getByText("Unassigned")).toBeVisible();

  // Delete asks first.
  await page.getByRole("button", { name: "Delete task" }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page).toHaveURL(/\/tasks$/);
  await expect(page.getByText("Book the DJ and lights")).toBeHidden();
  const gone = await page.goto(taskUrl);
  expect(gone!.status()).toBe(404);
  await manager.dispose();
});
