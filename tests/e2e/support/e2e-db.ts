import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";

// End-to-end tests that need an account run against their own database,
// MONGODB_TEST_URI with "_e2e" appended to its name (decision 58). Without
// MONGODB_TEST_URI those tests are skipped.

const envFile = new URL("../../../.env.local", import.meta.url);
const testUri =
  process.env.MONGODB_TEST_URI ??
  (existsSync(envFile)
    ? parseEnv(readFileSync(envFile, "utf8")).MONGODB_TEST_URI
    : undefined);

function e2eUri(uri: string): string {
  const url = new URL(uri);
  url.pathname = `${url.pathname.replace(/\/$/, "") || "/mmm_test"}_e2e`;
  return url.toString();
}

export const E2E_DB_URI = testUri ? e2eUri(testUri) : undefined;

/** The seeded organiser: verified, Admin of "E2E weds Test". */
export const E2E_USER = {
  name: "E2E Admin",
  email: "e2e.admin@example.com",
  password: "e2e-admin-password",
};
