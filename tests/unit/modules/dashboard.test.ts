import { describe, expect, it } from "vitest";

import { getDashboard } from "@/modules/dashboard";
// Test-only reach into the module, to check its sample data and schema.
// eslint-disable-next-line no-restricted-imports
import { sampleDashboard } from "@/modules/dashboard/sample";
// eslint-disable-next-line no-restricted-imports
import { dashboardSchema } from "@/modules/dashboard/schemas";

const DAY_MS = 24 * 60 * 60 * 1000;
const sample = sampleDashboard;

describe("dashboard schema", () => {
  it("accepts the sample", () => {
    expect(dashboardSchema.safeParse(sample).success).toBe(true);
  });

  it("rejects money that isn't whole paise", () => {
    const bad = { ...sample, money: { ...sample.money, spentPaise: 10.5 } };
    expect(dashboardSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a phone number that isn't E.164", () => {
    const bad = {
      ...sample,
      weddingDayContacts: [
        { ...sample.weddingDayContacts[0]!, phone: "98765 00001" },
      ],
    };
    expect(dashboardSchema.safeParse(bad).success).toBe(false);
  });

  it("allows storage to be absent, as it is for Managers", () => {
    const managerView = { ...sample, storage: undefined };
    expect(dashboardSchema.safeParse(managerView).success).toBe(true);
  });
});

describe("sample dashboard is internally consistent", () => {
  it("counts days left from the sample's today", () => {
    const days =
      (Date.parse(sample.countdown.date) - Date.parse(sample.today)) / DAY_MS;
    expect(sample.countdown.daysLeft).toBe(days);
  });

  it("marks exactly the tasks due before today as overdue, listed first", () => {
    for (const task of sample.myTasks) {
      expect(task.overdue).toBe(
        task.dueDate !== null && task.dueDate < sample.today,
      );
    }
    const flags = sample.myTasks.map((task) => task.overdue);
    expect(flags).toEqual([...flags].sort((a, b) => Number(b) - Number(a)));

    const myOverdue = flags.filter(Boolean).length;
    expect(myOverdue).toBeLessThanOrEqual(sample.tasks.overdue);
    expect(sample.tasks.overdue).toBeLessThanOrEqual(
      sample.tasks.todo + sample.tasks.inProgress,
    );
  });

  it("lists upcoming events in order, each ending after it starts", () => {
    const starts = sample.upcomingEvents.map((event) =>
      Date.parse(event.startAt),
    );
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
    for (const event of sample.upcomingEvents) {
      expect(Date.parse(event.endAt)).toBeGreaterThan(
        Date.parse(event.startAt),
      );
    }
  });

  it("keeps pending payments nearest-first, within the pending total", () => {
    const { pendingPayments, pendingPaise, nextDue } = sample.money;
    const dates = pendingPayments.map((payment) => payment.dueDate);
    expect(dates).toEqual([...dates].sort());

    const listed = pendingPayments.reduce((sum, p) => sum + p.amountPaise, 0);
    expect(listed).toBeLessThanOrEqual(pendingPaise);

    expect(nextDue).toEqual({
      description: pendingPayments[0]!.description,
      dueDate: pendingPayments[0]!.dueDate,
    });
  });

  it("splits households into replied and pending", () => {
    expect(sample.rsvp.replied + sample.rsvp.pending).toBe(
      sample.totals.households,
    );
  });

  it("lists recent activity newest first", () => {
    const times = sample.recentActivity.map((entry) => Date.parse(entry.at));
    expect(times).toEqual([...times].sort((a, b) => b - a));
  });
});

describe("getDashboard", () => {
  it("returns the sample until the real modules exist", async () => {
    await expect(getDashboard()).resolves.toEqual(sample);
  });
});
