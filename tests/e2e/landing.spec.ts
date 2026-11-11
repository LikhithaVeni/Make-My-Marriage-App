import { expect, test } from "@playwright/test";

import { E2E_DB_URI, E2E_USER } from "./support/e2e-db";
import { logIn } from "./support/login";

test("a visitor sees Log in, Sign up and Create your wedding", async ({
  request,
}) => {
  const html = await (await request.get("/")).text();
  expect(html).toContain("Sign up");
  expect(html).toContain("Create your wedding");
  expect(html).toContain("Already planning?");
  expect(html).not.toContain("Go to dashboard");
});

test("a signed-in organiser sees their name and Go to dashboard instead", async ({
  request,
}) => {
  test.skip(!E2E_DB_URI, "needs MONGODB_TEST_URI for a seeded account");
  await logIn(request);

  const html = await (await request.get("/")).text();
  expect(html).toContain(E2E_USER.name);
  expect(html).toContain("Go to dashboard");
  expect(html).not.toContain("Create your wedding");
  expect(html).not.toContain("Already planning?");
});

test("visiting an app page renews the session cookie for 30 days", async ({
  request,
}) => {
  test.skip(!E2E_DB_URI, "needs MONGODB_TEST_URI for a seeded account");
  await logIn(request);

  const response = await request.get("/dashboard", { maxRedirects: 0 });
  expect(response.status()).toBe(200);
  const cookie = response.headers()["set-cookie"] ?? "";
  expect(cookie).toContain("mmm_session=");
  expect(cookie).toContain("Max-Age=2592000");
});
