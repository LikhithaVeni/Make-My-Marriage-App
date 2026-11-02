import { defineConfig } from "@playwright/test";

const isCI = Boolean(process.env.CI);
// `next dev` and `next start` read PORT too, so the app and the tests agree.
// Set it when another app already uses port 3000.
const port = process.env.PORT ?? "3000";
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? "github" : "list",
  use: {
    baseURL,
  },
  webServer: {
    // CI tests the production build; locally the dev server is enough.
    command: isCI ? "pnpm start" : "pnpm dev",
    url: `${baseURL}/api/health`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
