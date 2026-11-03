// dashboard business logic: builds the dashboard from other modules' services.
// Callers outside this module reach it only through index.ts.
//
// Until those modules exist it returns sample data (docs/decisions.md,
// decision 42): the full sample, or with `sample: "empty"` a brand-new
// wedding. It will take the request context once auth exists, and the
// `sample` option goes away with the sample data.

import { emptySampleDashboard, sampleDashboard } from "./sample";
import { type Dashboard, dashboardSchema } from "./schemas";

export type SampleName = "full" | "empty";

export async function getDashboard({
  sample = "full",
}: { sample?: SampleName } = {}): Promise<Dashboard> {
  return dashboardSchema.parse(
    sample === "empty" ? emptySampleDashboard : sampleDashboard,
  );
}
