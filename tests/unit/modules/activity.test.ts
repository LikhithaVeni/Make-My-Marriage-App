import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  activityPeople,
  changesOf,
  listActivity,
  listActivityQuerySchema,
  parseActivityQuery,
  quoted,
  recentActivity,
  recordActivity,
} from "@/modules/activity";
import {
  getCurrentSession,
  signup,
  verifyEmail,
  type StartedSession,
} from "@/modules/auth";
import {
  createEvent,
  createEventSchema,
  deleteEvent,
  updateEvent,
  updateEventSchema,
} from "@/modules/events";
import {
  createExpense,
  createExpenseSchema,
  updateExpense,
  updateExpenseSchema,
} from "@/modules/expenses";
import {
  createTask,
  createTaskSchema,
  updateTask,
  updateTaskSchema,
} from "@/modules/tasks";
import {
  createVendor,
  createVendorSchema,
  updateVendor,
  updateVendorSchema,
} from "@/modules/vendors";
import { createInvite, createWedding } from "@/modules/wedding";
import type { WeddingContext } from "@/platform/rbac";

import { startTestDb, TEST_DB_URI } from "../helpers/test-db";

// PRD "Activity log"; API Design `GET /activity`; Database Design
// "activityLog"; decision 77.

vi.setConfig({ testTimeout: 60_000 });

describe("activity helpers", () => {
  it("quotes labels, shortening long ones", () => {
    expect(quoted("Book the DJ")).toBe("'Book the DJ'");
    expect(quoted("x".repeat(80))).toBe(`'${"x".repeat(57)}…'`);
  });

  it("lists what changed, hiding long or private values", () => {
    expect(
      changesOf(
        { city: "Hyderabad", notes: "old", date: "2028-01-28", tagline: "a" },
        { city: "Vizag", notes: "new", date: "2028-01-28", tagline: undefined },
        ["notes"],
      ),
    ).toEqual([
      { field: "city", from: "Hyderabad", to: "Vizag" },
      { field: "notes" },
    ]);
    // Clearing a value records null.
    expect(changesOf({ dressCode: "Yellow" }, { dressCode: "" })).toEqual([
      { field: "dressCode", from: "Yellow", to: null },
    ]);
  });

  it("reads the filters", () => {
    expect(
      parseActivityQuery(new URLSearchParams("entityType=TASK&from=2027-11-01"))
        .data,
    ).toMatchObject({ entityType: "TASK", from: "2027-11-01", limit: 50 });
    for (const bad of ["entityType=TODO", "from=2027-02-30", "cursor=abc"]) {
      expect(parseActivityQuery(new URLSearchParams(bad)).success).toBe(false);
    }
  });
});

let db: Awaited<ReturnType<typeof startTestDb>> | undefined;

beforeAll(async () => {
  if (!TEST_DB_URI) return;
  db = await startTestDb("activity");
}, 120_000);

afterAll(async () => {
  await db?.stop();
});

const client = { ip: "203.0.113.60", userAgent: "vitest" };

async function adminWithWedding() {
  const log = vi.spyOn(console, "info").mockImplementation(() => {});
  let started!: StartedSession;
  try {
    started = await signup(
      {
        name: "Likhitha",
        email: "likhitha.activity@example.com",
        password: "a-long-password",
      },
      client,
    );
    const link = /verify\?token=([\w-]+)/.exec(
      String(log.mock.calls[0]?.[0]),
    )?.[1];
    await verifyEmail(link!);
    await createWedding((await getCurrentSession(started.token))!.context, {
      brideName: "Likhitha",
      groomName: "Kaushik",
      title: "KaLi's era",
      date: "2028-01-28",
      city: "Hyderabad",
      slug: "kalis-era-activity",
    });
    return (await getCurrentSession(started.token))!.context as WeddingContext;
  } finally {
    log.mockRestore();
  }
}

const summaries = async (ctx: WeddingContext, input: object = {}) =>
  (await listActivity(ctx, listActivityQuerySchema.parse(input))).entries.map(
    (entry) => entry.summary,
  );

describe.skipIf(!TEST_DB_URI)("activity log", () => {
  let ctx: WeddingContext;

  beforeAll(async () => {
    ctx = await adminWithWedding();
  }, 120_000);

  it("records each change as a sentence with who did it, newest first", async () => {
    const event = await createEvent(
      ctx,
      createEventSchema.parse({
        name: "Sangeet",
        startAt: "2028-01-26T19:00:00+05:30",
        endAt: "2028-01-26T23:00:00+05:30",
        venue: { name: "Hall", address: "Road 12" },
      }),
    );
    await updateEvent(
      ctx,
      event.id,
      updateEventSchema.parse({
        venue: { name: "Grand Hall" },
        dressCode: "Indo-western",
      }),
    );
    const task = await createTask(
      ctx,
      createTaskSchema.parse({ title: "Book the DJ", assigneeId: ctx.userId }),
    );
    await updateTask(
      ctx,
      task.id,
      updateTaskSchema.parse({ status: "COMPLETED" }),
    );
    const vendor = await createVendor(
      ctx,
      createVendorSchema.parse({ name: "Bloom Decor", serviceType: "Decor" }),
    );
    await updateVendor(
      ctx,
      vendor.id,
      updateVendorSchema.parse({ bookingStatus: "BOOKED" }),
      new Map(),
    );
    const balance = await createExpense(
      ctx,
      createExpenseSchema.parse({
        amountPaise: 1_20_000_00,
        date: "2027-11-01",
        eventId: event.id,
        vendorId: vendor.id,
        category: "DECOR",
        description: "Decor balance",
        paidBy: "Likhitha",
        status: "PENDING",
        dueDate: "2028-01-20",
      }),
    );
    await updateExpense(
      ctx,
      balance.id,
      updateExpenseSchema.parse({ status: "PAID" }),
    );
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    await createInvite(ctx, "Likhitha", {
      name: "Priya",
      email: "priya.activity@example.com",
      role: "MANAGER",
    });
    log.mockRestore();

    expect(await summaries(ctx)).toEqual([
      "Likhitha invited Priya as a Manager",
      "Likhitha marked ₹1,20,000 for 'Decor balance' as paid",
      "Likhitha added ₹1,20,000 due 20 Jan 2028 for 'Decor balance'",
      "Likhitha moved 'Bloom Decor' to Booked",
      "Likhitha added the vendor 'Bloom Decor' (Decor)",
      "Likhitha completed 'Book the DJ'",
      "Likhitha added the task 'Book the DJ' for Likhitha",
      "Likhitha edited 'Sangeet' (venue, dress code)",
      "Likhitha added the event 'Sangeet'",
      "Likhitha created the wedding 'KaLi's era'",
    ]);

    // An edit keeps what changed; the invite keeps no email address.
    const [invite, , , , , , , edit] = (
      await listActivity(ctx, listActivityQuerySchema.parse({}))
    ).entries;
    expect(JSON.stringify(invite)).not.toContain("@");
    expect(edit!.changes).toEqual([
      { field: "venueName", from: "Hall", to: "Grand Hall" },
      { field: "dressCode", from: null, to: "Indo-western" },
    ]);

    await deleteEvent(ctx, event.id);
    expect((await summaries(ctx))[0]).toBe(
      "Likhitha deleted the event 'Sangeet'",
    );
  });

  it("filters by area, person and date, and pages newest first", async () => {
    expect(await summaries(ctx, { entityType: "TASK" })).toEqual([
      "Likhitha completed 'Book the DJ'",
      "Likhitha added the task 'Book the DJ' for Likhitha",
    ]);
    expect((await summaries(ctx, { actorId: ctx.userId })).length).toBe(11);
    expect(await activityPeople(ctx)).toEqual([
      { id: ctx.userId, name: "Likhitha" },
    ]);
    // Everything happened today (India time); nothing yesterday.
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
    }).format(new Date());
    expect((await summaries(ctx, { from: today, to: today })).length).toBe(11);
    expect(await summaries(ctx, { to: "2020-01-01" })).toEqual([]);

    const all = await summaries(ctx);
    const seen: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await listActivity(
        ctx,
        listActivityQuerySchema.parse({ limit: 4, cursor }),
      );
      seen.push(...page.entries.map((entry) => entry.summary));
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    expect(seen).toEqual(all);
    expect((await recentActivity(ctx, 3)).map((e) => e.summary)).toEqual(
      all.slice(0, 3),
    );
  });

  it("keeps each wedding's log to itself, and never breaks a change", async () => {
    const other: WeddingContext = {
      userId: ctx.userId,
      weddingId: "0123456789abcdef01234567",
      role: "ADMIN",
    };
    expect(await summaries(other)).toEqual([]);
    // A broken entry (an id that isn't one) is logged, not thrown.
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      recordActivity(
        { userId: ctx.userId, weddingId: "not-an-id" },
        {
          action: "CREATE",
          entity: { type: "TASK", id: "nope", label: "x" },
          did: "did something",
        },
      ),
    ).resolves.toBeUndefined();
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});
