// dashboard business logic: builds the dashboard from other modules' services.
// Callers outside this module reach it only through index.ts.
//
// Until those modules exist it returns sample data (docs/decisions.md,
// decision 42): the full sample, with `sample: "empty"` a brand-new wedding,
// or with `sample: "error"` a failure, to show the error state. It will take
// the request context once auth exists, and the `sample` option goes away with
// the sample data.

import { emptySampleDashboard, sampleDashboard } from "./sample";
import { type Dashboard, dashboardSchema } from "./schemas";

export type SampleName = "full" | "empty" | "error";

export async function getDashboard({
  sample = "full",
}: { sample?: SampleName } = {}): Promise<Dashboard> {
  if (sample === "error") {
    throw new Error("Sample dashboard failure (?sample=error).");
  }
  return dashboardSchema.parse(
    sample === "empty" ? emptySampleDashboard : sampleDashboard,
  );
}
