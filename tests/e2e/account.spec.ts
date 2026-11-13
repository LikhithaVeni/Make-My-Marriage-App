import { expect, test } from "@playwright/test";

import { E2E_DB_URI } from "./support/e2e-db";

// Changing your name and password (API Design `PATCH /auth/me`), with a
// fresh account so the seeded organiser's password never changes.
test.skip(!E2E_DB_URI, "needs MONGODB_TEST_URI");

const csrf = { "X-Requested-With": "mmm" };

test("you can change your name, and your password with the current one", async ({
  playwright,
  baseURL,
}) => {
  const phone = await playwright.request.newContext({ baseURL });
  const laptop = await playwright.request.newContext({ baseURL });
  const email = "account.e2e@example.com";

  expect(
    (
      await phone.post("/api/v1/auth/signup", {
        headers: csrf,
        data: { name: "Account", email, password: "first-password-1" },
      })
    ).status(),
  ).toBe(201);
  expect(
    (
      await laptop.post("/api/v1/auth/login", {
        headers: csrf,
        data: { email, password: "first-password-1" },
      })
    ).status(),
  ).toBe(200);

  const renamed = await phone.patch("/api/v1/auth/me", {
    headers: csrf,
    data: { name: "Account Holder" },
  });
  expect(renamed.status()).toBe(200);
  expect((await renamed.json()).data.user.name).toBe("Account Holder");

  const wrong = await phone.patch("/api/v1/auth/me", {
    headers: csrf,
    data: { currentPassword: "not-it", newPassword: "second-password-2" },
  });
  expect(wrong.status()).toBe(400);
  expect(
    (await wrong.json()).error.details.fields.currentPassword,
  ).toBeTruthy();

  const changed = await phone.patch("/api/v1/auth/me", {
    headers: csrf,
    data: {
      currentPassword: "first-password-1",
      newPassword: "second-password-2",
    },
  });
  expect(changed.status()).toBe(200);

  // This device stays logged in; the other one is logged out.
  expect((await phone.get("/api/v1/auth/me")).status()).toBe(200);
  expect((await laptop.get("/api/v1/auth/me")).status()).toBe(401);

  // Without the CSRF header, nothing changes.
  expect(
    (await phone.patch("/api/v1/auth/me", { data: { name: "X" } })).status(),
  ).toBe(403);

  await phone.dispose();
  await laptop.dispose();
});
