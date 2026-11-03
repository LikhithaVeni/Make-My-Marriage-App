// dashboard business logic: builds the dashboard from other modules' services.
// Callers outside this module reach it only through index.ts.
//
// Until those modules exist it returns sample data (docs/decisions.md,
// decision 42). It will take the request context once auth exists.

import { sampleDashboard } from "./sample";
import { type Dashboard, dashboardSchema } from "./schemas";

export async function getDashboard(): Promise<Dashboard> {
  return dashboardSchema.parse(sampleDashboard);
}
