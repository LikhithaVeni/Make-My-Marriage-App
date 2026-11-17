import { expect, test } from "@playwright/test";

import { ownVisitor } from "./support/client-ip";
import { E2E_DB_URI } from "./support/e2e-db";
import { closeDb, seedInvite, seedOtherWedding } from "./support/invites";

// Expenses (PRD "Expenses and vendors", key flow F4; API Design "Expenses";
// decision 74). The test makes its own wedding.
test.skip(!E2E_DB_URI, "needs MONGODB_TEST_URI");
test.afterAll(closeDb);

const csrf = { "X-Requested-With": "mmm" };

test("organisers record spending and pending payments; the dashboard follows", async ({
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
    const email = `expenses.${role.toLowerCase()}.e2e@example.com`;
    const token = await seedInvite({ email, role, weddingId, name });
    const res = await request.post(`/api/v1/auth/signup?invite=${token}`, {
      headers: { ...csrf, ...ownVisitor() },
      data: { name, email, password: "e2e-expenses-password" },
    });
    expect(res.status()).toBe(201);
  };
  await join(page.request, "ADMIN", "Venu");
  const manager = await playwright.request.newContext({ baseURL });
  await join(manager, "MANAGER", "Priya");

  // Nothing yet, and no events: the page says to add events first.
  await page.goto("/expenses");
  await expect(page.getByText("No expenses yet")).toBeVisible();
  await expect(page.getByText(/Add your events first/)).toBeVisible();

  const sangeet = await page.request.post("/api/v1/events", {
    headers: csrf,
    data: {
      name: "Sangeet",
      startAt: "2028-01-26T19:00:00+05:30",
      endAt: "2028-01-26T23:00:00+05:30",
      venue: { name: "Hall", address: "Road 12" },
    },
  });
  const eventId = (await sangeet.json()).data.id as string;

  // Add from the event's page: the event is chosen; Paid by is the viewer.
  await page.goto(`/events/${eventId}`);
  await expect(page.getByText("No expenses for Sangeet yet")).toBeVisible();
  await page.getByRole("link", { name: "Add expense" }).click();
  await expect(page.getByLabel("Event")).toHaveValue(eventId);
  await expect(page.getByLabel("Paid by")).toHaveValue("Venu");

  const add = page.getByRole("button", { name: "Add expense" });
  await page.getByLabel("Amount (₹)").fill("forty");
  await add.click();
  await expect(
    page.getByText("Enter an amount like 45,000 or 1,500.50"),
  ).toBeVisible();
  await page.getByLabel("Amount (₹)").fill("45,000");
  await add.click();
  await expect(page.getByText("Pick a category")).toBeVisible();

  await page.getByLabel("Category").selectOption("DECOR");
  await page.getByLabel("Description (optional)").fill("Decor advance");
  await add.click();
  await expect(page).toHaveURL(/\/expenses\/[0-9a-f]{24}$/, {
    timeout: 20_000,
  });
  await expect(
    page.getByRole("heading", { name: "Decor advance" }),
  ).toBeVisible();
  await expect(page.getByText("₹45,000")).toBeVisible();

  // A balance still due needs a due date.
  await page.goto(`/expenses/new?eventId=${eventId}`);
  await page.getByLabel("Amount (₹)").fill("1,20,000");
  await page.getByLabel("Category").selectOption("DECOR");
  await page.getByLabel("Status").selectOption("PENDING");
  await page.getByLabel("Description (optional)").fill("Decor balance");
  await page.getByRole("button", { name: "Add expense" }).click();
  await expect(page.getByText("Choose when it's due")).toBeVisible();
  await page.getByLabel("Due date").fill("2020-01-20");
  await page.getByRole("button", { name: "Add expense" }).click();
  await expect(page).toHaveURL(/\/expenses\/[0-9a-f]{24}$/, {
    timeout: 20_000,
  });
  const balanceUrl = page.url();
  await expect(page.getByText(/Overdue/)).toBeVisible();

  // The dashboard: spent and the pending payment, which opens it.
  await page.goto("/dashboard");
  const totals = page.getByRole("region", { name: "Totals" });
  await expect(totals.getByText("₹45,000")).toBeVisible();
  await expect(totals.getByText("₹1.2 L pending")).toBeVisible();
  const payments = page.getByRole("region", { name: "Pending payments" });
  await expect(payments.getByText("Decor balance")).toBeVisible();
  // "Overdue" once, not twice (found in QA).
  await expect(
    payments.getByText("Overdue · 20 Jan", { exact: true }),
  ).toBeVisible();
  await expect(payments.getByText("₹1,20,000 total")).toBeVisible();

  // A pending payment blocks deleting its event.
  await page.goto(`/events/${eventId}`);
  await expect(page.getByText("₹45,000 spent")).toBeVisible();
  await page.getByRole("button", { name: "Delete event" }).click();
  await expect(page.getByText("Payment pending: Decor balance")).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();

  // Mark it paid in one tap.
  await page.goto("/dashboard");
  await payments.getByRole("link", { name: /Decor balance/ }).click();
  await expect(page).toHaveURL(balanceUrl);
  await page.getByRole("button", { name: "Mark as paid" }).click();
  await expect(page.getByRole("button", { name: "Mark as paid" })).toBeHidden();
  await expect(page.getByText("Paid", { exact: true })).toBeVisible();

  // The Expenses page: totals per event and category, and a filter.
  await page.goto("/expenses");
  await expect(
    page.getByRole("heading", { name: "Spent per event" }),
  ).toBeVisible();
  await expect(page.getByText("₹1,65,000").first()).toBeVisible();
  await page.goto("/expenses?status=PENDING");
  await expect(page.getByText("No expenses match")).toBeVisible();

  // A Manager can record and delete too (API Design).
  const managerExpense = await manager.post("/api/v1/expenses", {
    headers: csrf,
    data: {
      amountPaise: 150000,
      date: "2027-11-01",
      eventId,
      category: "POOJA",
      paidBy: "Priya",
      status: "PAID",
    },
  });
  expect(managerExpense.status()).toBe(201);
  const { id: managerId } = (await managerExpense.json()).data;
  expect(
    (
      await manager.delete(`/api/v1/expenses/${managerId}`, { headers: csrf })
    ).status(),
  ).toBe(204);

  // Delete asks first.
  await page.goto(balanceUrl);
  await page.getByRole("button", { name: "Delete expense" }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page).toHaveURL(/\/expenses$/);
  expect((await page.goto(balanceUrl))!.status()).toBe(404);
  await manager.dispose();
});
