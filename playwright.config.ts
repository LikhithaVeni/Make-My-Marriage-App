import { defineConfig } from "@playwright/test";

import { E2E_DB_URI } from "./tests/e2e/support/e2e-db";

const isCI = Boolean(process.env.CI);
// `next dev` and `next start` read PORT too, so the app and the tests agree.
// Not 3000: a running `pnpm dev` there uses the real database and real email,
// and `reuseExistingServer` would test against it (decision 65).
const port = process.env.PORT ?? "3100";
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  // Seeds the e2e database with a logged-in-able organiser (decision 58).
  globalSetup: "./tests/e2e/global-setup.ts",
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? "github" : "list",
  // Locally the dev server builds each page on its first visit, which can
  // take several seconds while tests run side by side; CI tests a build.
  expect: { timeout: isCI ? 5_000 : 10_000 },
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
    // Point the app at the e2e database, and switch email off: tests sign up
    // made-up addresses, and real sends to them would bounce and hurt the
    // sending domain's reputation (decision 64).
    env: {
      ...(process.env as Record<string, string>),
      ...(E2E_DB_URI ? { MONGODB_URI: E2E_DB_URI } : {}),
      PORT: port,
      NEXT_PUBLIC_APP_URL: baseURL,
      // Its own build folder, so it can run while `pnpm dev` does. CI builds
      // into the default folder before `pnpm start`.
      ...(isCI ? {} : { NEXT_DIST_DIR: ".next-e2e" }),
      RESEND_API_KEY: "",
      GMAIL_APP_PASSWORD: "",
    },
    timeout: 120_000,
  },
});
