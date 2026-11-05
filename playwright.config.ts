import { defineConfig } from "@playwright/test";

import { E2E_DB_URI } from "./tests/e2e/support/e2e-db";

const isCI = Boolean(process.env.CI);
// `next dev` and `next start` read PORT too, so the app and the tests agree.
// Set it when another app already uses port 3000.
const port = process.env.PORT ?? "3000";
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  // Seeds the e2e database with a logged-in-able organiser (decision 58).
  globalSetup: "./tests/e2e/global-setup.ts",
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? "github" : "list",
  use: {
    baseURL,
  },
  webServer: {
    // CI tests the production build; locally the dev server is enough.
    command: isCI ? "pnpm start" : "pnpm dev",
    // The landing page, not /api/health: health answers 503 when a configured
    // database is down, which would stop every test from starting.
    url: `${baseURL}/`,
    reuseExistingServer: !isCI,
    // Point the app at the e2e database, so tests never touch real data.
    env: E2E_DB_URI
      ? ({ ...process.env, MONGODB_URI: E2E_DB_URI } as Record<string, string>)
      : undefined,
    timeout: 120_000,
  },
});
