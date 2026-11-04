import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

// Modules from docs/System Design v1.md. Code outside a module may import it
// only through its index.ts (`@/modules/tasks`), never a file inside it
// (`@/modules/tasks/model`, `@/modules/tasks/service`, ...).
const modules = [
  "auth",
  "wedding",
  "events",
  "tasks",
  "expenses",
  "vendors",
  "guests",
  "invitations",
  "gallery",
  "notifications",
  "activity",
  // Owns no collections; composes the others (docs/decisions.md, decision 42).
  "dashboard",
];

const message =
  "Import another module only through its index.ts, e.g. `@/modules/tasks`.";

function moduleBoundary(owner) {
  const group = ["**/modules/*/*"];
  if (owner) {
    // A module may import its own files, but reach other modules only via index.ts.
    group.push(`!**/modules/${owner}/*`, "../*/*", `!../${owner}/*`);
  }
  return ["error", { patterns: [{ group, message }] }];
}

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    files: ["**/*.{js,jsx,mjs,ts,tsx}"],
    rules: { "no-restricted-imports": moduleBoundary() },
  },
  ...modules.map((owner) => ({
    files: [`src/modules/${owner}/**/*.{ts,tsx}`],
    rules: { "no-restricted-imports": moduleBoundary(owner) },
  })),
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
  ]),
]);
