import { randomBytes } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  checkEventDelete,
  createEvent,
  createEventSchema,
  deleteEvent,
} from "@/modules/events";
import {
  createExpense,
  createExpenseSchema,
  deleteExpense,
  DUE_DATE_NEEDED,
  expenseEventLinks,
  expenseSummary,
  expensesPolicy,
  getExpense,
  listExpenses,
  listExpensesQuerySchema,
  parseExpenseQuery,
  unlinkTaskExpenses,
  updateExpense,
  updateExpenseSchema,
} from "@/modules/expenses";
import { createTask, createTaskSchema, deleteTask } from "@/modules/tasks";
import { parseRupees, paiseToInput } from "@/lib/format";
import { AppError } from "@/platform/errors";
import { authorize, type Role, type WeddingContext } from "@/platform/rbac";

import { startTestDb, TEST_DB_URI } from "../helpers/test-db";

// PRD "Expenses and vendors", key flow F4; API Design "Expenses"; decision 74.

describe("rupees in forms", () => {
  it("reads typed rupees as whole paise", () => {
    expect(parseRupees("45,000")).toBe(4_500_000);
    expect(parseRupees("1,50,000.5")).toBe(15_000_050);
    expect(parseRupees("₹ 999.99")).toBe(99_999);
    expect(parseRupees("0.01")).toBe(1);
    for (const bad of ["", "0", "12.345", "abc", "-5", "1e5"]) {
      expect(parseRupees(bad)).toBeNull();
    }
    expect(paiseToInput(4_500_050)).toBe("45000.50");
    expect(paiseToInput(4_500_000)).toBe("45000");
  });
});

const sangeetBase = {
  amountPaise: 4_500_000,
  date: "2027-10-02",
  category: "DECOR",
  paidBy: "Venu",
  status: "PAID",
} as const;

describe("expense schemas", () => {
  it("needs the PRD's required fields", () => {
    const result = createExpenseSchema.safeParse({});
    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual(
      expect.arrayContaining([
        "amountPaise",
        "date",
        "eventId",
        "category",
        "paidBy",
        "status",
      ]),
    );
  });

  it("refuses zero, fractions of a paisa, huge amounts and impossible dates", () => {
    const eventId = "0123456789abcdef01234567";
    for (const amountPaise of [0, -5, 10.5, 10_00_00_000_01]) {
      expect(
        createExpenseSchema.safeParse({ ...sangeetBase, eventId, amountPaise })
          .success,
      ).toBe(false);
    }
    expect(
      createExpenseSchema.safeParse({
        ...sangeetBase,
        eventId,
        date: "2027-02-30",
      }).success,
    ).toBe(false);
  });

  it("needs a due date when Pending (Database Design)", () => {
    const result = createExpenseSchema.safeParse({
      ...sangeetBase,
      eventId: "0123456789abcdef01234567",
      status: "PENDING",
    });
    expect(result.error?.issues[0]).toMatchObject({
      path: ["dueDate"],
      message: DUE_DATE_NEEDED,
    });
  });

  it("reads the list's filters and refuses bad ones", () => {
    expect(
      parseExpenseQuery(
        new URLSearchParams("eventId=none&status=PENDING&from=2027-01-01"),
      ).data,
    ).toMatchObject({
      eventId: "none",
      status: "PENDING",
      from: "2027-01-01",
      sort: "-date",
    });
    for (const bad of ["sort=amount", "status=DUE", "category=FOOD", "to=x"]) {
      expect(parseExpenseQuery(new URLSearchParams(bad)).success).toBe(false);
    }
    expect(updateExpenseSchema.safeParse({}).success).toBe(false);
  });

  it("is open to Admins and Managers, including delete (API Design)", () => {
    const allowed = (role: Role) => {
      try {
        authorize(
          { userId: "u", emailVerified: true, weddingId: "w", role },
          expensesPolicy,
          "expenses.delete",
        );
        return true;
      } catch {
        return false;
      }
    };
    expect([
      allowed("ADMIN"),
      allowed("MANAGER"),
      allowed("PHOTOGRAPHER"),
    ]).toEqual([true, true, false]);
  });
});

let db: Awaited<ReturnType<typeof startTestDb>> | undefined;

beforeAll(async () => {
  if (!TEST_DB_URI) return;
  db = await startTestDb("expenses");
}, 120_000);

afterAll(async () => {
  await db?.stop();
});

const objectId = () => randomBytes(12).toString("hex");
const context = (weddingId = objectId()): WeddingContext => ({
  userId: objectId(),
  weddingId,
  role: "ADMIN",
});
const NOW = new Date("2027-11-15T06:00:00Z");

async function failure(promise: Promise<unknown>): Promise<AppError> {
  try {
    await promise;
  } catch (err) {
    if (err instanceof AppError) return err;
    throw err;
  }
  throw new Error("Expected an AppError");
}

async function eventIn(ctx: WeddingContext, name: string) {
  return createEvent(
    ctx,
    createEventSchema.parse({
      name,
      startAt: "2028-01-26T19:00:00+05:30",
      endAt: "2028-01-26T23:00:00+05:30",
      venue: { name: "Hall", address: "Road 12" },
    }),
  );
}

const add = (ctx: WeddingContext, input: Record<string, unknown>) =>
  createExpense(
    ctx,
    createExpenseSchema.parse({ ...sangeetBase, ...input }),
    NOW,
  );

describe.skipIf(!TEST_DB_URI)("expenses service", () => {
  it("records an expense with its event and task, only from this wedding", async () => {
    const ctx = context();
    const sangeet = await eventIn(ctx, "Sangeet");
    const task = await createTask(
      ctx,
      createTaskSchema.parse({ title: "Book decorator", eventId: sangeet.id }),
    );
    const expense = await add(ctx, {
      eventId: sangeet.id,
      taskId: task.id,
      description: "Decor advance",
    });
    expect(expense).toMatchObject({
      amountPaise: 4_500_000,
      event: { id: sangeet.id, name: "Sangeet" },
      task: { id: task.id, title: "Book decorator" },
      vendor: null,
      status: "PAID",
      overdue: false,
    });

    const other = context();
    const theirs = await eventIn(other, "Haldi");
    const err = await failure(add(ctx, { eventId: theirs.id }));
    expect(err.details).toEqual({
      fields: { eventId: "Choose one of this wedding's events" },
    });
    expect((await failure(getExpense(other, expense.id))).code).toBe(
      "NOT_FOUND",
    );
    expect(
      (await listExpenses(other, listExpensesQuerySchema.parse({}))).expenses,
    ).toEqual([]);
  });

  it("marks a Pending payment Paid, keeping the due-date rule", async () => {
    const ctx = context();
    const { id: eventId } = await eventIn(ctx, "Pelli");
    const balance = await add(ctx, {
      eventId,
      status: "PENDING",
      dueDate: "2027-11-10",
      description: "Decor balance",
    });
    expect(balance.overdue).toBe(true);

    // Clearing the due date of a Pending payment is refused.
    const refused = await failure(
      updateExpense(
        ctx,
        balance.id,
        updateExpenseSchema.parse({ dueDate: "" }),
      ),
    );
    expect(refused.details).toEqual({ fields: { dueDate: DUE_DATE_NEEDED } });

    const paid = await updateExpense(
      ctx,
      balance.id,
      updateExpenseSchema.parse({ status: "PAID", amountPaise: 4_600_000 }),
      NOW,
    );
    expect(paid).toMatchObject({
      status: "PAID",
      amountPaise: 4_600_000,
      overdue: false,
      description: "Decor balance",
    });
    // Back to Pending needs a due date, which it still has.
    await updateExpense(
      ctx,
      balance.id,
      updateExpenseSchema.parse({ status: "PENDING" }),
    );
    await deleteExpense(ctx, balance.id);
    expect((await failure(getExpense(ctx, balance.id))).code).toBe("NOT_FOUND");
  });

  it("filters, sorts, pages and totals", async () => {
    const ctx = context();
    const sangeet = await eventIn(ctx, "Sangeet");
    const haldi = await eventIn(ctx, "Haldi");
    await add(ctx, {
      eventId: sangeet.id,
      amountPaise: 9_000_000,
      category: "CATERING",
      date: "2027-09-01",
    });
    await add(ctx, {
      eventId: sangeet.id,
      amountPaise: 2_000_000,
      date: "2027-10-05",
    });
    await add(ctx, {
      eventId: haldi.id,
      amountPaise: 500_000,
      category: "POOJA",
      date: "2027-08-20",
    });
    await add(ctx, {
      eventId: haldi.id,
      amountPaise: 1_500_000,
      status: "PENDING",
      dueDate: "2028-01-20",
      category: "CATERING",
      date: "2027-11-01",
    });
    await add(ctx, {
      eventId: sangeet.id,
      amountPaise: 3_000_000,
      status: "PENDING",
      dueDate: "2027-12-15",
      description: "Lights balance",
      date: "2027-11-02",
    });

    const amounts = async (input: Record<string, unknown>) =>
      (
        await listExpenses(ctx, listExpensesQuerySchema.parse(input), NOW)
      ).expenses.map((e) => e.amountPaise);
    expect(await amounts({})).toEqual([
      3_000_000, 1_500_000, 2_000_000, 9_000_000, 500_000,
    ]);
    expect(await amounts({ sort: "-amountPaise" })).toEqual([
      9_000_000, 3_000_000, 2_000_000, 1_500_000, 500_000,
    ]);
    expect(await amounts({ status: "PENDING", sort: "dueDate" })).toEqual([
      3_000_000, 1_500_000,
    ]);
    expect(await amounts({ eventId: haldi.id })).toEqual([1_500_000, 500_000]);
    expect(await amounts({ category: "CATERING" })).toEqual([
      1_500_000, 9_000_000,
    ]);
    expect(await amounts({ from: "2027-09-01", to: "2027-10-31" })).toEqual([
      2_000_000, 9_000_000,
    ]);

    const seen: number[] = [];
    let cursor: string | undefined;
    do {
      const page = await listExpenses(
        ctx,
        listExpensesQuerySchema.parse({ limit: 2, cursor }),
        NOW,
      );
      seen.push(...page.expenses.map((e) => e.amountPaise));
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    expect(seen).toEqual(await amounts({}));

    const summary = await expenseSummary(ctx);
    expect(summary).toMatchObject({
      totalPaise: 16_000_000,
      paidPaise: 11_500_000,
      pendingPaise: 4_500_000,
      nextDue: { description: "Lights balance", dueDate: "2027-12-15" },
      count: 5,
    });
    expect(
      summary.pendingPayments.map((p) => [p.description, p.dueDate]),
    ).toEqual([
      ["Lights balance", "2027-12-15"],
      ["Catering · Haldi", "2028-01-20"],
    ]);
    expect(summary.byEvent).toEqual([
      {
        eventId: sangeet.id,
        name: "Sangeet",
        totalPaise: 14_000_000,
        paidPaise: 11_000_000,
      },
      {
        eventId: haldi.id,
        name: "Haldi",
        totalPaise: 2_000_000,
        paidPaise: 500_000,
      },
    ]);
    expect(summary.byCategory[0]).toEqual({
      category: "CATERING",
      totalPaise: 10_500_000,
      paidPaise: 9_000_000,
    });
  });

  it("blocks deleting an event with a Pending payment; Paid ones move to No event", async () => {
    const ctx = context();
    const { id: eventId } = await eventIn(ctx, "Cocktail");
    const pending = await add(ctx, {
      eventId,
      status: "PENDING",
      dueDate: "2028-01-01",
      description: "Bar balance",
    });
    const paid = await add(ctx, { eventId, description: "Bar advance" });

    const blocked = await checkEventDelete(ctx, eventId, [expenseEventLinks]);
    expect(blocked).toMatchObject({
      blocked: true,
      blockingExpenses: [
        { id: pending.id, description: "Bar balance", amountPaise: 4_500_000 },
      ],
      willUnlink: { paidExpenses: 1 },
    });
    expect(
      (await failure(deleteEvent(ctx, eventId, [expenseEventLinks]))).code,
    ).toBe("EVENT_HAS_ACTIVE_ITEMS");

    await updateExpense(
      ctx,
      pending.id,
      updateExpenseSchema.parse({ status: "PAID" }),
    );
    await deleteEvent(ctx, eventId, [expenseEventLinks]);
    for (const id of [paid.id, pending.id]) {
      expect((await getExpense(ctx, id)).event).toBeNull();
    }
    expect((await expenseSummary(ctx)).byEvent).toEqual([
      {
        eventId: null,
        name: "No event",
        totalPaise: 9_000_000,
        paidPaise: 9_000_000,
      },
    ]);
    expect(
      (
        await listExpenses(
          ctx,
          listExpensesQuerySchema.parse({ eventId: "none" }),
        )
      ).expenses,
    ).toHaveLength(2);
  });

  it("keeps a deleted task's expenses, without the link", async () => {
    const ctx = context();
    const { id: eventId } = await eventIn(ctx, "Mehendi");
    const task = await createTask(
      ctx,
      createTaskSchema.parse({ title: "Mehendi artist" }),
    );
    const expense = await add(ctx, { eventId, taskId: task.id });
    await deleteTask(ctx, task.id, unlinkTaskExpenses);
    const after = await getExpense(ctx, expense.id);
    expect(after.task).toBeNull();
    expect(after.amountPaise).toBe(4_500_000);
  });
});
