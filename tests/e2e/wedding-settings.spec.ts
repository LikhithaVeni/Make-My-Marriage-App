import { expect, test } from "@playwright/test";

import { E2E_DB_URI } from "./support/e2e-db";
import { closeDb, seedInvite, seedOtherWedding } from "./support/invites";

// Wedding details (PRD "Wedding setup, editable later"; API Design
// `GET` and `PATCH /wedding`). The test makes its own wedding, so editing
// it never changes the seeded one other tests rely on.
test.skip(!E2E_DB_URI, "needs MONGODB_TEST_URI");
test.afterAll(closeDb);

const csrf = { "X-Requested-With": "mmm" };
const PASSWORD = "e2e-settings-password";

test("an Admin edits the wedding's details; a Manager can only view them", async ({
  page,
  playwright,
  baseURL,
}) => {
  const weddingId = await seedOtherWedding();
  const adminToken = await seedInvite({
    email: "settings.admin.e2e@example.com",
    role: "ADMIN",
    weddingId,
  });
  const managerToken = await seedInvite({
    email: "settings.manager.e2e@example.com",
    role: "MANAGER",
    weddingId,
  });

  // The browser's own request context shares its cookies with the page.
  const admin = page.request;
  expect(
    (
      await admin.post(`/api/v1/auth/signup?invite=${adminToken}`, {
        headers: csrf,
        data: {
          name: "Settings Admin",
          email: "settings.admin.e2e@example.com",
          password: PASSWORD,
        },
      })
    ).status(),
  ).toBe(201);
  const manager = await playwright.request.newContext({ baseURL });
  expect(
    (
      await manager.post(`/api/v1/auth/signup?invite=${managerToken}`, {
        headers: csrf,
        data: {
          name: "Settings Manager",
          email: "settings.manager.e2e@example.com",
          password: PASSWORD,
        },
      })
    ).status(),
  ).toBe(201);

  // The API: both can read, only the Admin can change.
  const read = await manager.get("/api/v1/wedding");
  expect(read.status()).toBe(200);
  expect((await read.json()).data.wedding).toMatchObject({
    title: "Another wedding",
    city: "Chennai",
  });
  expect(
    (
      await manager.patch("/api/v1/wedding", {
        headers: csrf,
        data: { city: "Madurai" },
      })
    ).status(),
  ).toBe(403);
  const settings = await manager.get("/settings/wedding", { maxRedirects: 0 });
  expect(settings.status()).toBe(307);
  expect(settings.headers().location).toContain("/dashboard");

  // Without the CSRF header, nothing changes.
  expect(
    (await admin.patch("/api/v1/wedding", { data: { city: "X" } })).status(),
  ).toBe(403);
  // Someone else's address is refused with suggestions.
  const taken = await admin.patch("/api/v1/wedding", {
    headers: csrf,
    data: { slug: "e2e-weds-test" },
  });
  expect(taken.status()).toBe(409);
  expect((await taken.json()).error.code).toBe("SLUG_TAKEN");

  // The page: change the name and city, save, and the sidebar follows.
  await page.goto("/settings/wedding");
  await expect(
    page.getByRole("heading", { level: 1, name: "Wedding details" }),
  ).toBeVisible();
  const title = page.getByLabel("Wedding name");
  await expect(title).toHaveValue("Another wedding");
  const save = page.getByRole("button", { name: "Save changes" });
  await expect(save).toBeDisabled();

  await title.fill("Settings weds E2E");
  await page.getByLabel("City").fill("Madurai");
  await save.click();
  await expect(
    page.getByRole("status").filter({ hasText: "Saved." }),
  ).toBeVisible();
  await expect(save).toBeDisabled();
  await expect(page.getByText("Settings weds E2E").first()).toBeVisible();

  // An emptied required field is refused and named.
  await page.getByLabel("City").fill("");
  await save.click();
  await expect(page.getByText("Enter the city")).toBeVisible();

  // The Manager sees the saved details.
  expect(
    (await (await manager.get("/api/v1/wedding")).json()).data.wedding,
  ).toMatchObject({ title: "Settings weds E2E", city: "Madurai" });
  await manager.dispose();
});
