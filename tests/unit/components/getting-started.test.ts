import { describe, expect, it } from "vitest";

import { gettingStartedItems } from "@/components/dashboard/GettingStartedCard";
import {
  emptySampleDashboard,
  sampleDashboard,
} from "../fixtures/dashboard-sample";

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

  it("offers each step to whoever can do it today (decision 73)", () => {
    const early = {
      ...emptySampleDashboard,
      totals: {
        ...emptySampleDashboard.totals,
        households: null,
        people: null,
      },
    };
    const startable = (canInvite: boolean) =>
      gettingStartedItems(early, { canInvite }).map((item) => [
        item.label,
        item.available,
        item.href,
      ]);
    // Admins invite and add events; anyone adds tasks; guests come later.
    expect(startable(true)).toEqual([
      ["Invite family members", true, "/settings/members"],
      ["Add events", true, "/events/new"],
      ["Add tasks", true, "/tasks/new"],
      ["Add guests", false, "/guests"],
    ]);
    expect(startable(false).map(([, available]) => available)).toEqual([
      false,
      false,
      true,
      false,
    ]);
    expect(done(early).at(-1)).toEqual(["Add guests", false]);
  });

  it("says what was added and links to it, instead of crossing out (decision 76)", () => {
    const partway = {
      ...emptySampleDashboard,
      totals: { ...emptySampleDashboard.totals, members: 2, events: 1 },
      tasks: { todo: 2, inProgress: 1, completed: 0, overdue: 0 },
    };
    const notes = (canInvite: boolean) =>
      gettingStartedItems(partway, { canInvite })
        .filter((item) => item.done)
        .map((item) => [item.label, item.doneNote, item.viewHref]);
    expect(notes(true)).toEqual([
      ["Invite family members", "1 family member joined", "/settings/members"],
      ["Add events", "1 event added", "/events"],
      ["Add tasks", "3 tasks added", "/tasks"],
    ]);
    // Managers can't open Settings, so there's no link to it.
    expect(notes(false)[0]).toEqual([
      "Invite family members",
      "1 family member joined",
      null,
    ]);
  });
});
