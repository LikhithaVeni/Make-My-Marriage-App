import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  getCurrentSession,
  signup,
  verifyEmail,
  type StartedSession,
} from "@/modules/auth";
import { dashboardSchema, getDashboard } from "@/modules/dashboard";
import { createEvent, createEventSchema } from "@/modules/events";
import {
  createTask,
  createTaskSchema,
  updateTask,
  updateTaskSchema,
} from "@/modules/tasks";
import { acceptInvite, createInvite, createWedding } from "@/modules/wedding";
import type { WeddingContext } from "@/platform/rbac";

import {
  emptySampleDashboard,
  sampleDashboard,
} from "../fixtures/dashboard-sample";
import { startTestDb, TEST_DB_URI } from "../helpers/test-db";

// PRD "Dashboard"; API Design `GET /dashboard`; decisions 40 and 73.

vi.setConfig({ testTimeout: 60_000 });

describe("dashboard schema", () => {
  it("accepts a busy wedding and a brand-new one", () => {
    expect(dashboardSchema.safeParse(sampleDashboard).success).toBe(true);
    expect(dashboardSchema.safeParse(emptySampleDashboard).success).toBe(true);
  });

  it("takes null for parts whose feature isn't built yet (decision 73)", () => {
    const early = {
      ...sampleDashboard,
      totals: {
        ...sampleDashboard.totals,
        vendors: null,
        households: null,
        people: null,
      },
      rsvp: null,
      money: null,
      weddingDayContacts: null,
      recentActivity: null,
    };
    expect(dashboardSchema.safeParse(early).success).toBe(true);
    // Members and events are always known.
    expect(
      dashboardSchema.safeParse({
        ...early,
        totals: { ...early.totals, events: null },
      }).success,
    ).toBe(false);
  });

  it("rejects money that isn't whole paise and phones that aren't E.164", () => {
    const money = sampleDashboard.money!;
    expect(
      dashboardSchema.safeParse({
        ...sampleDashboard,
        money: { ...money, spentPaise: 10.5 },
      }).success,
    ).toBe(false);
    expect(
      dashboardSchema.safeParse({
        ...sampleDashboard,
        weddingDayContacts: [
          { ...sampleDashboard.weddingDayContacts![0]!, phone: "98765 00001" },
        ],
      }).success,
    ).toBe(false);
  });

  it("allows storage to be absent, as it is for Managers", () => {
    expect(
      dashboardSchema.safeParse({ ...sampleDashboard, storage: undefined })
        .success,
    ).toBe(true);
  });
});

let db: Awaited<ReturnType<typeof startTestDb>> | undefined;

beforeAll(async () => {
  if (!TEST_DB_URI) return;
  db = await startTestDb("dashboard");
}, 120_000);

afterAll(async () => {
  await db?.stop();
});

const client = { ip: "203.0.113.50", userAgent: "vitest" };

async function printed(run: () => Promise<unknown>) {
  const log = vi.spyOn(console, "info").mockImplementation(() => {});
  try {
    await run();
    return log.mock.calls.map((call) => String(call[0])).join("\n");
  } finally {
    log.mockRestore();
  }
}
const linkIn = (text: string, kind: "verify" | "invite") =>
  new RegExp(`/${kind}[?/](?:token=)?([\\w-]+)`).exec(text)?.[1];

async function adminWithWedding() {
  let started!: StartedSession;
  const text = await printed(async () => {
    started = await signup(
      {
        name: "Likhitha",
        email: "likhitha.dash@example.com",
        password: "a-long-password",
      },
      client,
    );
  });
  await verifyEmail(linkIn(text, "verify")!);
  await createWedding((await getCurrentSession(started.token))!.context, {
    brideName: "Likhitha",
    groomName: "Kaushik",
    title: "KaLi's era",
    date: "2028-01-28",
    city: "Hyderabad",
    slug: "kalis-era-dash",
  });
  return (await getCurrentSession(started.token))!.context as WeddingContext;
}

async function managerOf(admin: WeddingContext) {
  const email = "priya.dash@example.com";
  const text = await printed(() =>
    createInvite(admin, "Likhitha", { name: "Priya", email, role: "MANAGER" }),
  );
  const started = await signup(
    { name: "Priya", email, password: "a-long-password" },
    client,
    undefined,
    { sendVerification: false },
  );
  await acceptInvite(
    { id: started.result.user.id, email },
    linkIn(text, "invite")!,
  );
  return (await getCurrentSession(started.token))!.context as WeddingContext;
}

// 11:30 am on 15 November 2027 in India.
const NOW = new Date("2027-11-15T06:00:00Z");

describe.skipIf(!TEST_DB_URI)("getDashboard (real data)", () => {
  let admin: WeddingContext;
  let manager: WeddingContext;

  beforeAll(async () => {
    admin = await adminWithWedding();
  }, 120_000);

  it("shows a brand-new wedding: countdown, nothing added, the rest not built", async () => {
    const dashboard = await getDashboard(admin, NOW);
    expect(dashboard).toMatchObject({
      today: "2027-11-15",
      countdown: {
        date: "2028-01-28",
        daysLeft: 74,
        title: "KaLi's era",
        city: "Hyderabad",
        coverUrl: null,
      },
      myTasks: [],
      tasks: { todo: 0, inProgress: 0, completed: 0, overdue: 0 },
      upcomingEvents: [],
      totals: {
        members: 1,
        events: 0,
        vendors: null,
        households: null,
        people: null,
      },
      rsvp: null,
      money: null,
      weddingDayContacts: null,
      recentActivity: null,
    });
    expect(dashboard.storage).toBeUndefined();
  });

  it("counts tasks, lists the viewer's open ones overdue first, and the next events", async () => {
    manager = await managerOf(admin);
    const event = (name: string, start: string, end: string) =>
      createEvent(
        admin,
        createEventSchema.parse({
          name,
          startAt: start,
          endAt: end,
          venue: { name: `${name} hall`, address: "Road 1" },
          dressCode: name === "Haldi" ? "Yellow" : undefined,
        }),
      );
    // Already over: not upcoming.
    await event(
      "Engagement",
      "2027-11-01T18:00:00+05:30",
      "2027-11-01T22:00:00+05:30",
    );
    // Under way now: still upcoming until it ends.
    const today = await event(
      "Puja",
      "2027-11-15T09:00:00+05:30",
      "2027-11-15T13:00:00+05:30",
    );
    await event(
      "Haldi",
      "2028-01-25T09:00:00+05:30",
      "2028-01-25T12:00:00+05:30",
    );
    await event(
      "Sangeet",
      "2028-01-26T19:00:00+05:30",
      "2028-01-27T01:00:00+05:30",
    );
    await event(
      "Pelli",
      "2028-01-28T20:00:00+05:30",
      "2028-01-29T03:00:00+05:30",
    );

    const task = (title: string, extra: Record<string, unknown> = {}) =>
      createTask(admin, createTaskSchema.parse({ title, ...extra }), NOW);
    const me = admin.userId;
    await task("Book caterer", { assigneeId: me, dueDate: "2027-12-01" });
    await task("Order sweets", {
      assigneeId: me,
      dueDate: "2027-11-10",
      eventId: today.id,
    }); // overdue
    await task("Pack gifts", { assigneeId: me }); // no due date: last
    const busy = await task("Print cards", {
      assigneeId: me,
      dueDate: "2027-11-12",
      priority: "HIGH",
    }); // overdue
    await updateTask(
      admin,
      busy.id,
      updateTaskSchema.parse({ status: "IN_PROGRESS" }),
      NOW,
    );
    const done = await task("Book hall", { assigneeId: me });
    await updateTask(
      admin,
      done.id,
      updateTaskSchema.parse({ status: "COMPLETED" }),
      NOW,
    );
    await task("Hire DJ", {
      assigneeId: manager.userId,
      dueDate: "2027-11-01",
    }); // overdue, not mine

    const dashboard = await getDashboard(admin, NOW);
    expect(dashboard.tasks).toEqual({
      todo: 4,
      inProgress: 1,
      completed: 1,
      overdue: 3,
    });
    expect(
      dashboard.myTasks.map((t) => [t.title, t.overdue, t.eventName]),
    ).toEqual([
      // Overdue first, the longest overdue at the top.
      ["Order sweets", true, "Puja"],
      ["Print cards", true, null],
      ["Book caterer", false, null],
      ["Pack gifts", false, null],
    ]);
    expect(dashboard.upcomingEvents.map((e) => e.name)).toEqual([
      "Puja",
      "Haldi",
      "Sangeet",
    ]);
    expect(dashboard.upcomingEvents[1]).toMatchObject({
      venueName: "Haldi hall",
      dressCode: "Yellow",
    });
    expect(dashboard.totals).toMatchObject({ members: 2, events: 5 });

    // The Manager sees the same wedding, with their own tasks.
    const theirs = await getDashboard(manager, NOW);
    expect(theirs.myTasks.map((t) => t.title)).toEqual(["Hire DJ"]);
    expect(theirs.tasks).toEqual(dashboard.tasks);
  });
});
