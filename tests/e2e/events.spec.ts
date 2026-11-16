import { expect, test } from "@playwright/test";

import { E2E_DB_URI } from "./support/e2e-db";
import { closeDb, seedInvite, seedOtherWedding } from "./support/invites";

// Events (PRD "Events", key flow F3; API Design "Events"; decision 70). The
// test makes its own wedding, so its events never reach other tests.
test.skip(!E2E_DB_URI, "needs MONGODB_TEST_URI");
test.afterAll(closeDb);

const csrf = { "X-Requested-With": "mmm" };
const PASSWORD = "e2e-events-password";

test("an Admin plans the schedule; a Manager edits details only", async ({
  page,
  playwright,
  baseURL,
}) => {
  test.setTimeout(120_000);
  const weddingId = await seedOtherWedding();
  const join = async (
    request: typeof page.request,
    role: "ADMIN" | "MANAGER",
  ) => {
    const email = `events.${role.toLowerCase()}.e2e@example.com`;
    const token = await seedInvite({ email, role, weddingId });
    const response = await request.post(`/api/v1/auth/signup?invite=${token}`, {
      headers: csrf,
      data: { name: `Events ${role}`, email, password: PASSWORD },
    });
    expect(response.status()).toBe(201);
  };
  await join(page.request, "ADMIN");
  const manager = await playwright.request.newContext({ baseURL });
  await join(manager, "MANAGER");

  // An empty schedule offers to add the first event.
  await page.goto("/events");
  await expect(page.getByText("No events yet")).toBeVisible();
  await page.getByRole("link", { name: "Add event" }).click();
  await expect(page).toHaveURL(/\/events\/new$/);

  // Missing fields are named; an end before the start is refused.
  const add = page.getByRole("button", { name: "Add event" });
  await add.click();
  await expect(page.getByText("Enter the event's name")).toBeVisible();
  await expect(page.getByText("Enter the venue's name")).toBeVisible();

  await page.getByLabel("Event name").fill("Sangeet");
  await page.getByLabel("Starts").fill("2028-01-26T19:00");
  await page.getByLabel("Ends").fill("2028-01-26T18:00");
  await page.getByLabel("Venue name").fill("Grand Palace Hall");
  await page.getByLabel("Venue address").fill("Road No. 12, Banjara Hills");
  await add.click();
  await expect(page.getByText("The end must be after the start")).toBeVisible();

  // Ending after midnight is fine; a muhurtham and dress code are optional.
  await page.getByLabel("Ends").fill("2028-01-27T01:30");
  await page.getByLabel("Muhurtham (optional)").fill("2028-01-26T23:16");
  await page.getByLabel("Dress code (optional)").fill("Indo-western");
  await page
    .getByLabel("Instructions for guests (optional)")
    .fill("Parking at the back gate");
  await add.click();

  // The event's page shows it in India time, with a map link.
  await expect(page).toHaveURL(/\/events\/[0-9a-f]{24}$/);
  const eventUrl = page.url();
  await expect(
    page.getByRole("heading", { level: 1, name: "Sangeet" }),
  ).toBeVisible();
  await expect(page.getByText("Wednesday, 26 January 2028")).toBeVisible();
  await expect(
    page.getByText("7:00 PM – 1:30 AM (next day)", { exact: false }),
  ).toBeVisible();
  await expect(page.getByText("11:16 PM")).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Open in Google Maps/ }),
  ).toHaveAttribute(
    "href",
    /google\.com\/maps\/search\/.*Grand%20Palace%20Hall/,
  );

  // A second, earlier event comes first in the schedule.
  const created = await page.request.post("/api/v1/events", {
    headers: csrf,
    data: {
      name: "Haldi",
      startAt: "2028-01-25T09:00:00+05:30",
      endAt: "2028-01-25T12:00:00+05:30",
      venue: { name: "Home", address: "Jubilee Hills" },
    },
  });
  expect(created.status()).toBe(201);
  await page.goto("/events");
  await expect(page.getByText("2 events, earliest first")).toBeVisible();
  const names = page.locator("main li a span.font-medium");
  await expect(names).toHaveText(["Haldi", "Sangeet"]);
  await expect(
    page.getByRole("heading", { name: "Tuesday, 25 January 2028" }),
  ).toBeVisible();

  // The Manager sees the schedule but can't add or delete, and edits
  // details without the livestream link.
  const asManager = await manager.get("/api/v1/events");
  expect(asManager.status()).toBe(200);
  const listed = (await asManager.json()).data as { name: string }[];
  expect(listed.map((event) => event.name)).toEqual(["Haldi", "Sangeet"]);
  const sangeetId = eventUrl.split("/").pop()!;
  expect(
    (
      await manager.post("/api/v1/events", {
        headers: csrf,
        data: { name: "Mine" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await manager.patch(`/api/v1/events/${sangeetId}`, {
        headers: csrf,
        data: { livestreamUrl: "https://youtu.be/abc" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await manager.delete(`/api/v1/events/${sangeetId}`, { headers: csrf })
    ).status(),
  ).toBe(403);
  const managerEdit = await manager.patch(`/api/v1/events/${sangeetId}`, {
    headers: csrf,
    data: { dressCode: "Pastels" },
  });
  expect(managerEdit.status()).toBe(200);
  const newPage = await manager.get("/events/new", { maxRedirects: 0 });
  expect(newPage.status()).toBe(307);
  expect(newPage.headers().location).toContain("/dashboard");

  // The Admin edits: the Manager's change is there; clearing a field works.
  await page.goto(eventUrl);
  await expect(page.getByText("Pastels")).toBeVisible();
  await page.getByRole("link", { name: "Edit details" }).click();
  await expect(page.getByLabel("Dress code (optional)")).toHaveValue("Pastels");
  await expect(page.getByLabel("Starts")).toHaveValue("2028-01-26T19:00");
  await page.getByLabel("Dress code (optional)").fill("");
  await page
    .getByLabel("Livestream link (optional)")
    .fill("https://vimeo.com/1");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByText("Use a YouTube link (youtube.com or youtu.be)"),
  ).toBeVisible();
  await page
    .getByLabel("Livestream link (optional)")
    .fill("https://youtube.com/live/abc");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(eventUrl);
  await expect(page.getByText("Pastels")).toBeHidden();
  await expect(
    page.getByRole("link", { name: /youtube\.com\/live\/abc/ }),
  ).toBeVisible();

  // Delete asks first, then the schedule has one event left.
  await page.getByRole("button", { name: "Delete event" }).click();
  await expect(page.getByText("Delete Sangeet?")).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await page.getByRole("button", { name: "Delete event" }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page).toHaveURL(/\/events$/);
  await expect(page.getByText("1 event, earliest first")).toBeVisible();

  // A deleted or unknown event is a 404.
  const gone = await page.goto(eventUrl);
  expect(gone!.status()).toBe(404);
  await manager.dispose();
});
