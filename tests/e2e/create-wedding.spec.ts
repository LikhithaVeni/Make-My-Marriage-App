import { expect, test } from "@playwright/test";

import { ownVisitor } from "./support/client-ip";
import { E2E_DB_URI } from "./support/e2e-db";
import { closeDb, markEmailVerified } from "./support/invites";

// Create wedding in the browser (PRD F1): the name and address follow the
// couple's names, a taken address offers free ones, and saving leads to the
// dashboard. Its address field is shared with Wedding details (decision 66).
test.skip(!E2E_DB_URI, "needs MONGODB_TEST_URI");
test.afterAll(closeDb);

test("a new organiser creates their wedding, picking a free address", async ({
  page,
}) => {
  const email = "create.e2e@example.com";
  expect(
    (
      await page.request.post("/api/v1/auth/signup", {
        headers: { "X-Requested-With": "mmm", ...ownVisitor() },
        data: { name: "Create E2E", email, password: "create-e2e-password" },
      })
    ).status(),
  ).toBe(201);
  await markEmailVerified(email);

  await page.goto("/wedding/new");
  await page.getByLabel("Bride's name").fill("Test");
  await page.getByLabel("Groom's name").fill("E2E");

  // The wedding name and address follow the names.
  await expect(page.getByLabel("Wedding name")).toHaveValue("E2E weds Test");
  const address = page.getByLabel("Website address");
  await expect(address).toHaveValue("e2e-weds-test");

  // The seeded wedding already uses that address.
  await expect(page.getByText("This address is taken.")).toBeVisible();
  const suggestion = page.getByRole("button", { name: /^e2e-weds-test-/ });
  await expect(suggestion.first()).toBeVisible();
  const picked = (await suggestion.first().textContent())!;
  await suggestion.first().click();
  await expect(address).toHaveValue(picked);
  await expect(page.getByText("This address is free.")).toBeVisible();

  await page.getByLabel("Wedding date").fill("2028-02-14");
  await page.getByLabel("City").fill("Hyderabad");
  await page.getByRole("button", { name: "Create wedding" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText("E2E weds Test").first()).toBeVisible();
});
