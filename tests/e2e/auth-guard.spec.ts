import { expect, test } from "@playwright/test";

import { E2E_DB_URI } from "./support/e2e-db";

test("logged-out visitors are sent to log in, keeping the page to return to", async ({
  request,
}) => {
  for (const path of ["/dashboard", "/wedding/new"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    const location = new URL(response.headers().location!, "http://x");
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("next")).toBe(path);
  }
});

test("an unknown or expired session cookie still can't open the app", async ({
  playwright,
  baseURL,
}) => {
  // The cookie passes the quick check; the page asks the database.
  test.skip(!E2E_DB_URI, "needs MONGODB_TEST_URI");
  const request = await playwright.request.newContext({
    baseURL,
    extraHTTPHeaders: { Cookie: "mmm_session=not-a-real-session" },
  });
  const response = await request.get("/dashboard", { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(new URL(response.headers().location!, "http://x").pathname).toBe(
    "/login",
  );
  await request.dispose();
});
