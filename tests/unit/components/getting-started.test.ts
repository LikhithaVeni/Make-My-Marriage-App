import { describe, expect, it } from "vitest";

import { gettingStartedItems } from "@/components/dashboard/GettingStartedCard";
// Test-only reach into the module, for its sample data.
// eslint-disable-next-line no-restricted-imports
import {
  emptySampleDashboard,
  sampleDashboard,
} from "@/modules/dashboard/sample";

const done = (dashboard: typeof sampleDashboard) =>
  gettingStartedItems(dashboard).map((item) => [item.label, item.done]);

describe("gettingStartedItems", () => {
  it("lists the PRD's four steps, none done for a new wedding", () => {
    expect(done(emptySampleDashboard)).toEqual([
      ["Invite family members", false],
      ["Add events", false],
      ["Add tasks", false],
      ["Add guests", false],
    ]);
  });

  it("marks every step done for a wedding in full swing", () => {
    expect(done(sampleDashboard).every(([, isDone]) => isDone)).toBe(true);
  });

  it("ticks steps off one by one", () => {
    const partway = {
      ...emptySampleDashboard,
      totals: { ...emptySampleDashboard.totals, members: 3, events: 2 },
      tasks: { todo: 0, inProgress: 0, completed: 1, overdue: 0 },
    };
    expect(done(partway)).toEqual([
      ["Invite family members", true],
      ["Add events", true],
      ["Add tasks", true],
      ["Add guests", false],
    ]);
  });
});
