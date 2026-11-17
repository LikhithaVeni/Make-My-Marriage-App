import { expect, test } from "@playwright/test";

import { ownVisitor } from "./support/client-ip";
import { E2E_DB_URI } from "./support/e2e-db";
import { closeDb, seedInvite, seedOtherWedding } from "./support/invites";

// Vendors (PRD "Vendors", key flow F4; API Design "Vendors"; decision 75).
test.skip(!E2E_DB_URI, "needs MONGODB_TEST_URI");
test.afterAll(closeDb);

const csrf = { "X-Requested-With": "mmm" };

test("find a vendor, save it, record payments; contacts and the dashboard follow", async ({
  page,
}) => {
  test.setTimeout(150_000);
  const weddingId = await seedOtherWedding();
  const email = "vendors.admin.e2e@example.com";
  const token = await seedInvite({ email, role: "ADMIN", weddingId });
  const signedUp = await page.request.post(
    `/api/v1/auth/signup?invite=${token}`,
    {
      headers: { ...csrf, ...ownVisitor() },
      data: { name: "Venu", email, password: "e2e-vendors-password" },
    },
  );
  expect(signedUp.status()).toBe(201);

  const event = await page.request.post("/api/v1/events", {
    headers: csrf,
    data: {
      name: "Sangeet",
      startAt: "2028-01-26T19:00:00+05:30",
      endAt: "2028-01-26T23:00:00+05:30",
      venue: { name: "Grand Hall", address: "Road 12, Hyderabad" },
    },
  });
  const eventId = (await event.json()).data.id as string;

  // Find nearby on the event's page builds a Google Maps search (PRD F4.1).
  await page.goto(`/events/${eventId}`);
  await page.getByLabel("Service").fill("Decorators");
  await expect(
    page.getByRole("link", { name: /Search on Google Maps/ }),
  ).toHaveAttribute(
    "href",
    "https://www.google.com/maps/search/?api=1&query=Decorators%20near%20Grand%20Hall%2C%20Road%2012%2C%20Hyderabad",
  );

  // Save the chosen vendor (F4.2).
  await page.goto("/vendors");
  await expect(page.getByText("No vendors yet")).toBeVisible();
  await page.getByRole("link", { name: "Add vendor" }).first().click();
  const save = page.getByRole("button", { name: "Add vendor" });
  await save.click();
  await expect(page.getByText("Enter the vendor's name")).toBeVisible();
  await page.getByLabel("Vendor name").fill("Bloom Decor");
  await page.getByLabel("Service").fill("Decor");
  await page.getByLabel("Phone (optional)").fill("123");
  await save.click();
  await expect(
    page.getByText("Enter a phone number like 98765 43210"),
  ).toBeVisible();
  await page.getByLabel("Phone (optional)").fill("098765-43210");
  await page.getByLabel("Quote (₹, optional)").fill("2,00,000");
  await page.getByLabel("Agreed cost (₹, optional)").fill("1,80,000");
  await page.getByLabel("Booking status").selectOption("BOOKED");
  await page.getByLabel(/Wedding-day contact/).check();
  await save.click();
  await expect(page).toHaveURL(/\/vendors\/[0-9a-f]{24}$/, { timeout: 20_000 });
  const vendorUrl = page.url();
  await expect(
    page.getByRole("heading", { name: "Bloom Decor" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "+91 98765 43210" }),
  ).toHaveAttribute("href", "tel:+919876543210");
  await expect(page.getByText("₹1,80,000 left to pay")).toBeVisible();

  // Record the advance from the vendor's page (F4.3): the vendor is chosen.
  await page.getByRole("link", { name: "Record payment" }).click();
  await expect(page.getByLabel("Vendor (optional)")).toHaveValue(
    vendorUrl.split("/").pop()!,
  );
  await page.getByLabel("Amount (₹)").fill("50,000");
  await page.getByLabel("Event").selectOption(eventId);
  await page.getByLabel("Category").selectOption("DECOR");
  await page.getByLabel("Description (optional)").fill("Decor advance");
  await page.getByRole("button", { name: "Add expense" }).click();
  await expect(page).toHaveURL(/\/expenses\/[0-9a-f]{24}$/, {
    timeout: 20_000,
  });
  await expect(page.getByRole("link", { name: "Bloom Decor" })).toBeVisible();

  await page.goto(vendorUrl);
  await expect(page.getByText("₹1,30,000 left to pay")).toBeVisible();
  await expect(page.getByText("Decor advance")).toBeVisible();

  // The list, the contacts page and the dashboard.
  await page.goto("/vendors");
  await expect(page.getByText("₹50,000 paid of ₹1,80,000")).toBeVisible();
  await page.goto("/vendors/contacts");
  await expect(
    page.getByRole("link", { name: "Call Bloom Decor" }),
  ).toHaveAttribute("href", "tel:+919876543210");
  await page.goto("/dashboard");
  const totals = page.getByRole("region", { name: "Totals" });
  await expect(totals.getByText("Comes with vendors")).toBeHidden();
  const contacts = page.getByRole("region", { name: "Wedding-day contacts" });
  await expect(contacts.getByText("Bloom Decor")).toBeVisible();

  // Deleting the vendor keeps the payment as an expense.
  await page.goto(vendorUrl);
  await page.getByRole("button", { name: "Delete vendor" }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page).toHaveURL(/\/vendors$/);
  await page.goto("/expenses");
  await expect(page.getByText("Decor advance")).toBeVisible();
});
