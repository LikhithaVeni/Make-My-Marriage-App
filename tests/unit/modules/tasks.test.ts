import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  getCurrentSession,
  signup,
  verifyEmail,
  type StartedSession,
} from "@/modules/auth";
import {
  checkEventDelete,
  createEvent,
  createEventSchema,
  deleteEvent,
} from "@/modules/events";
import {
  createTask,
  createTaskSchema,
  deleteTask,
  getTask,
  isOverdue,
  listTasks,
  listTasksQuerySchema,
  parseTaskQuery,
  taskAssignees,
  taskEventLinks,
  tasksPolicy,
  unassignTasksOf,
  updateTask,
  updateTaskSchema,
} from "@/modules/tasks";
import {
  acceptInvite,
  createInvite,
  createWedding,
  removeMember,
} from "@/modules/wedding";
import { AppError } from "@/platform/errors";
import { authorize, type Role, type WeddingContext } from "@/platform/rbac";

import { startTestDb, TEST_DB_URI } from "../helpers/test-db";

// PRD "Tasks", key flow F3; API Design "Tasks"; decision 71.

vi.setConfig({ testTimeout: 60_000 });

describe("task schemas", () => {
  it("defaults to Medium and needs a title", () => {
    expect(createTaskSchema.parse({ title: " Book DJ " })).toEqual({
      title: "Book DJ",
      priority: "MEDIUM",
    });
    expect(createTaskSchema.safeParse({ title: " " }).success).toBe(false);
  });

  it("refuses impossible dates and ids that aren't ids", () => {
    const result = createTaskSchema.safeParse({
      title: "Book DJ",
      dueDate: "2028-02-30",
      eventId: "haldi",
      assigneeId: "123",
      priority: "URGENT",
    });
    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual(
      expect.arrayContaining(["dueDate", "eventId", "assigneeId", "priority"]),
    );
  });

  it("clears optional fields with an empty value; refuses an empty change", () => {
    expect(
      updateTaskSchema.parse({
        description: "",
        eventId: "",
        assigneeId: "",
        dueDate: "",
      }),
    ).toEqual({ description: "", eventId: "", assigneeId: "", dueDate: "" });
    expect(updateTaskSchema.safeParse({}).success).toBe(false);
    expect(updateTaskSchema.safeParse({ title: "" }).success).toBe(false);
  });

  it("reads the list's query, with status repeated", () => {
    const parsed = parseTaskQuery(
      new URLSearchParams(
        "status=TODO&status=IN_PROGRESS&assigneeId=me&overdue=true&q=dj",
      ),
    );
    expect(parsed.data).toMatchObject({
      status: ["TODO", "IN_PROGRESS"],
      assigneeId: "me",
      overdue: "true",
      q: "dj",
      sort: "dueDate",
      limit: 50,
    });
    for (const bad of ["sort=title", "limit=101", "status=DONE", "eventId=x"]) {
      expect(parseTaskQuery(new URLSearchParams(bad)).success).toBe(false);
    }
  });
});

describe("tasks policy", () => {
  it("is for Admins and Managers only (API Design)", () => {
    const allowed = (role: Role) => {
      try {
        authorize(
          {
            userId: "u",
            emailVerified: true,
            weddingId: "w",
            role,
          },
          tasksPolicy,
          "tasks.delete",
        );
        return true;
      } catch {
        return false;
      }
    };
    expect(allowed("ADMIN")).toBe(true);
    expect(allowed("MANAGER")).toBe(true);
    expect(allowed("PHOTOGRAPHER")).toBe(false);
  });
});

describe("isOverdue", () => {
  it("is a passed due date on a task that isn't Completed (PRD)", () => {
    const today = "2027-11-15";
    expect(isOverdue({ dueDate: "2027-11-14", status: "TODO" }, today)).toBe(
      true,
    );
    expect(
      isOverdue({ dueDate: "2027-11-14", status: "IN_PROGRESS" }, today),
    ).toBe(true);
    expect(
      isOverdue({ dueDate: "2027-11-14", status: "COMPLETED" }, today),
    ).toBe(false);
    expect(isOverdue({ dueDate: "2027-11-15", status: "TODO" }, today)).toBe(
      false,
    );
    expect(isOverdue({ status: "TODO" }, today)).toBe(false);
  });
});

let db: Awaited<ReturnType<typeof startTestDb>> | undefined;

beforeAll(async () => {
  if (!TEST_DB_URI) return;
  db = await startTestDb("tasks");
}, 120_000);

afterAll(async () => {
  await db?.stop();
});

const client = { ip: "203.0.113.40", userAgent: "vitest" };

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

async function adminWithWedding(name: string, email: string, slug: string) {
  let started!: StartedSession;
  const text = await printed(async () => {
    started = await signup(
      { name, email, password: "a-long-password" },
      client,
    );
  });
  await verifyEmail(linkIn(text, "verify")!);
  const context = (await getCurrentSession(started.token))!.context;
  await createWedding(context, {
    brideName: "Asha",
    groomName: name,
    title: `${name}'s wedding`,
    date: "2028-02-14",
    city: "Hyderabad",
    slug,
  });
  return (await getCurrentSession(started.token))!.context as WeddingContext;
}

async function managerOf(admin: WeddingContext, name: string, email: string) {
  const text = await printed(() =>
    createInvite(admin, "Ravi", {
      name,
      email,
      role: "MANAGER",
      relationLabel: "Bride's sister",
    }),
  );
  const started = await signup(
    { name, email, password: "a-long-password" },
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

const query = (input: Record<string, unknown> = {}) =>
  listTasksQuerySchema.parse(input);

/** The AppError a promise rejects with. */
async function failure(promise: Promise<unknown>): Promise<AppError> {
  try {
    await promise;
  } catch (err) {
    if (err instanceof AppError) return err;
    throw err;
  }
  throw new Error("Expected an AppError");
}

const NOW = new Date("2027-11-15T06:00:00Z"); // 11:30 am in India

describe.skipIf(!TEST_DB_URI)("tasks service", () => {
  let admin: WeddingContext;
  let manager: WeddingContext;
  let outsider: WeddingContext;
  let sangeetId: string;
  let otherEventId: string;

  beforeAll(async () => {
    admin = await adminWithWedding(
      "Ravi",
      "ravi.tasks@example.com",
      "ravi-tasks",
    );
    manager = await managerOf(admin, "Priya", "priya.tasks@example.com");
    outsider = await adminWithWedding(
      "Arjun",
      "arjun.tasks@example.com",
      "arjun-tasks",
    );
    const event = (name: string) =>
      createEventSchema.parse({
        name,
        startAt: "2028-01-26T19:00:00+05:30",
        endAt: "2028-01-26T23:00:00+05:30",
        venue: { name: "Hall", address: "Road 12" },
      });
    sangeetId = (await createEvent(admin, event("Sangeet"))).id;
    otherEventId = (await createEvent(outsider, event("Haldi"))).id;
  }, 120_000);

  it("offers the wedding's Admins and Managers as assignees, by name", async () => {
    expect(await taskAssignees(admin)).toEqual([
      { id: manager.userId, name: "Priya", relationLabel: "Bride's sister" },
      { id: admin.userId, name: "Ravi", relationLabel: null },
    ]);
  });

  it("adds a task with its event and assignee, To Do", async () => {
    const task = await createTask(
      manager,
      createTaskSchema.parse({
        title: "Book mehendi artist",
        eventId: sangeetId,
        assigneeId: manager.userId,
        dueDate: "2027-11-20",
        priority: "HIGH",
      }),
      NOW,
    );
    expect(task).toMatchObject({
      title: "Book mehendi artist",
      status: "TODO",
      priority: "HIGH",
      overdue: false,
      event: { id: sangeetId, name: "Sangeet" },
      assignee: { id: manager.userId, name: "Priya" },
      completedAt: null,
    });
  });

  it("refuses another wedding's event or person", async () => {
    const err = await failure(
      createTask(
        admin,
        createTaskSchema.parse({
          title: "Sneaky",
          eventId: otherEventId,
          assigneeId: outsider.userId,
        }),
      ),
    );
    expect(err.code).toBe("VALIDATION_FAILED");
    expect(Object.keys(err.details!.fields as object).sort()).toEqual([
      "assigneeId",
      "eventId",
    ]);
  });

  it("filters, sorts and pages the list", async () => {
    const add = (title: string, extra: Record<string, unknown> = {}) =>
      createTask(admin, createTaskSchema.parse({ title, ...extra }), NOW);
    await add("Order sweets", { dueDate: "2027-11-10" }); // overdue
    await add("Print cards", { dueDate: "2027-11-12", priority: "LOW" });
    await add("Hire DJ", {
      eventId: sangeetId,
      assigneeId: admin.userId,
      priority: "HIGH",
    });
    await add("Pack gifts"); // no due date: last by default

    const titles = async (input: Record<string, unknown>) =>
      (await listTasks(admin, query(input), NOW)).tasks.map((t) => t.title);

    expect(await titles({})).toEqual([
      "Order sweets",
      "Print cards",
      "Book mehendi artist",
      "Hire DJ",
      "Pack gifts",
    ]);
    expect(await titles({ sort: "-priority" })).toEqual([
      "Book mehendi artist",
      "Hire DJ",
      "Order sweets",
      "Pack gifts",
      "Print cards",
    ]);
    expect(await titles({ assigneeId: "me" })).toEqual(["Hire DJ"]);
    expect(await titles({ assigneeId: manager.userId })).toEqual([
      "Book mehendi artist",
    ]);
    expect(await titles({ eventId: sangeetId })).toEqual([
      "Book mehendi artist",
      "Hire DJ",
    ]);
    expect(await titles({ eventId: "none", assigneeId: "none" })).toEqual([
      "Order sweets",
      "Print cards",
      "Pack gifts",
    ]);
    expect(await titles({ overdue: "true" })).toEqual([
      "Order sweets",
      "Print cards",
    ]);
    expect(await titles({ priority: "LOW" })).toEqual(["Print cards"]);
    expect(await titles({ q: "dj" })).toEqual(["Hire DJ"]);
    // Regex characters in a search are taken literally.
    expect(await titles({ q: ".*" })).toEqual([]);
    expect(await titles({ dueBefore: "2027-11-11" })).toEqual(["Order sweets"]);
    // Another wedding sees none of them.
    expect((await listTasks(outsider, query(), NOW)).tasks).toEqual([]);

    // Pages of two, following the cursor, give every task once, in order.
    const seen: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await listTasks(admin, query({ limit: 2, cursor }), NOW);
      expect(page.tasks.length).toBeLessThanOrEqual(2);
      seen.push(...page.tasks.map((t) => t.title));
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    expect(seen).toEqual(await titles({}));
    expect(
      (await failure(listTasks(admin, query({ cursor: "nonsense" }), NOW)))
        .code,
    ).toBe("VALIDATION_FAILED");
  });

  it("moves through statuses, recording completion; clears fields", async () => {
    const task = await createTask(
      admin,
      createTaskSchema.parse({
        title: "Book photographer",
        dueDate: "2027-11-01",
        eventId: sangeetId,
        assigneeId: manager.userId,
        description: "Ask for a quote",
      }),
      NOW,
    );
    expect(task.overdue).toBe(true);

    const done = await updateTask(
      manager,
      task.id,
      updateTaskSchema.parse({ status: "COMPLETED" }),
      NOW,
    );
    expect(done).toMatchObject({
      status: "COMPLETED",
      overdue: false,
      completedAt: NOW.toISOString(),
    });
    const reopened = await updateTask(
      admin,
      task.id,
      updateTaskSchema.parse({ status: "IN_PROGRESS" }),
      NOW,
    );
    expect(reopened).toMatchObject({ completedAt: null, overdue: true });

    const cleared = await updateTask(
      admin,
      task.id,
      updateTaskSchema.parse({
        eventId: "",
        assigneeId: "",
        dueDate: "",
        description: "",
      }),
      NOW,
    );
    expect(cleared).toMatchObject({
      title: "Book photographer",
      event: null,
      assignee: null,
      dueDate: null,
      description: null,
      overdue: false,
    });

    // Other weddings can't see, change or delete it.
    for (const attempt of [
      () => getTask(outsider, task.id),
      () =>
        updateTask(outsider, task.id, updateTaskSchema.parse({ title: "x" })),
      () => deleteTask(outsider, task.id),
      () => getTask(admin, "not-an-id"),
    ]) {
      expect((await failure(attempt())).code).toBe("NOT_FOUND");
    }

    await deleteTask(admin, task.id);
    expect((await failure(getTask(admin, task.id))).code).toBe("NOT_FOUND");
  });

  it("blocks deleting an event with a task in progress, then unlinks its tasks", async () => {
    const { id: eventId } = await createEvent(
      admin,
      createEventSchema.parse({
        name: "Cocktail",
        startAt: "2028-01-27T19:00:00+05:30",
        endAt: "2028-01-27T23:00:00+05:30",
        venue: { name: "Rooftop", address: "Road 1" },
      }),
    );
    const add = (title: string) =>
      createTask(admin, createTaskSchema.parse({ title, eventId }), NOW);
    const busy = await add("Book bartender");
    const todo = await add("Choose playlist");
    await updateTask(
      admin,
      busy.id,
      updateTaskSchema.parse({ status: "IN_PROGRESS" }),
    );

    const blocked = await checkEventDelete(admin, eventId, [taskEventLinks]);
    expect(blocked).toMatchObject({
      blocked: true,
      blockingTasks: [
        { id: busy.id, title: "Book bartender", status: "IN_PROGRESS" },
      ],
      willUnlink: { tasks: 1 },
    });
    const refused = await failure(
      deleteEvent(admin, eventId, [taskEventLinks]),
    );
    expect(refused.code).toBe("EVENT_HAS_ACTIVE_ITEMS");
    expect(refused.details!.tasks).toEqual(blocked.blockingTasks);

    await updateTask(
      admin,
      busy.id,
      updateTaskSchema.parse({ status: "COMPLETED" }),
    );
    await deleteEvent(admin, eventId, [taskEventLinks]);
    // Both tasks stay, as general tasks (Database Design).
    for (const id of [busy.id, todo.id]) {
      expect((await getTask(admin, id)).event).toBeNull();
    }
  });

  it("unassigns a removed member's tasks, keeping the tasks", async () => {
    const task = await createTask(
      admin,
      createTaskSchema.parse({
        title: "Confirm caterer",
        assigneeId: manager.userId,
      }),
      NOW,
    );
    await removeMember(admin, manager.userId, unassignTasksOf);
    const after = await getTask(admin, task.id);
    expect(after.assignee).toBeNull();
    expect(after.title).toBe("Confirm caterer");
    expect(
      (await listTasks(admin, query({ assigneeId: manager.userId }), NOW))
        .tasks,
    ).toEqual([]);
  });
});
