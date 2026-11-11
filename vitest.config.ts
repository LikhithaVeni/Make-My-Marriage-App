import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

import { defineConfig } from "vitest/config";

// Only the test database comes from .env.local (docs/decisions.md, decision
// 52); every other variable stays unset so tests don't depend on a machine.
const envFile = fileURLToPath(new URL("./.env.local", import.meta.url));
const testDbUri =
  process.env.MONGODB_TEST_URI ??
  (existsSync(envFile)
    ? parseEnv(readFileSync(envFile, "utf8")).MONGODB_TEST_URI
    : undefined) ??
  "";

export default defineConfig({
  resolve: {
    // Resolves the `@/*` alias from tsconfig.json.
    tsconfigPaths: true,
    alias: {
      // The real package throws outside a React Server Components bundle.
      "server-only": fileURLToPath(
        new URL("./tests/unit/stubs/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    env: { MONGODB_TEST_URI: testDbUri },
    // With a remote test database, one file at a time: parallel first
    // connections to Atlas can miss the 5-second server selection limit.
    fileParallelism: !testDbUri,
  },
});
