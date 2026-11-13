import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  getCurrentSession,
  signup,
  verifyEmail,
  type StartedSession,
} from "@/modules/auth";
import {
  acceptInvite,
  cancelInvite,
  createInvite,
  createWedding,
  inviteSchema,
  listMembers,
  membershipOf,
  previewInvite,
  removeMember,
  resendInvite,
  updateMember,
  weddingPolicy,
} from "@/modules/wedding";
import { AppError } from "@/platform/errors";
import { authorize, type WeddingContext } from "@/platform/rbac";

import { startTestDb, TEST_DB_URI } from "../helpers/test-db";

// bcrypt at cost 12 takes a few hundred milliseconds per hash or check.
vi.setConfig({ testTimeout: 90_000 });

let db: Awaited<ReturnType<typeof startTestDb>> | undefined;

beforeAll(async () => {
  if (!TEST_DB_URI) return;
  db = await startTestDb("members");
}, 120_000);

afterAll(async () => {
  await db?.stop();
});

const client = { ip: "203.0.113.30", userAgent: "vitest" };
const DAY = 24 * 60 * 60_000;

/** Runs something that prints emails, and returns what was printed. */
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

/** A verified user who has created a wedding; returns their Admin context. */
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
  const ctx = (await getCurrentSession(started.token))!.context;
  return {
    token: started.token,
    ctx: ctx as WeddingContext,
  };
}

/** Invites someone and returns the link's token. */
async function invite(
  ctx: WeddingContext,
  email: string,
  role: "ADMIN" | "MANAGER" = "MANAGER",
) {
  const text = await printed(() =>
    createInvite(ctx, "Ravi", { name: "Lakshmi", email, role }),
  );
  return linkIn(text, "invite")!;
}

/** Signs up with the invited email (no verification email) and accepts. */
async function join(email: string, token: string) {
  const started = await signup(
    { name: "Lakshmi", email, password: "a-long-password" },
    client,
    undefined,
    { sendVerification: false },
  );
  await acceptInvite({ id: started.result.user.id, email }, token);
  return started;
}

describe("members policy and invite schema", () => {
  it("lets only Admins manage members", () => {
    const manager = {
      userId: "u",
      emailVerified: true,
      weddingId: "w",
      role: "MANAGER" as const,
    };
    for (const action of Object.keys(weddingPolicy)) {
      expect(() =>
        authorize(manager, weddingPolicy, action as keyof typeof weddingPolicy),
      ).toThrow(AppError);
    }
  });

  it("lowercases the email and refuses the photographer role", () => {
    expect(
      inviteSchema.parse({
        name: " Lakshmi ",
        email: " Lakshmi@Example.com",
        role: "MANAGER",
        relationLabel: "Bride's mother",
      }),
    ).toEqual({
      name: "Lakshmi",
      email: "lakshmi@example.com",
      role: "MANAGER",
      relationLabel: "Bride's mother",
    });
    expect(
      inviteSchema.safeParse({
        name: "P",
        email: "p@example.com",
        role: "PHOTOGRAPHER",
      }).success,
    ).toBe(false);
  });
});

describe.skipIf(!TEST_DB_URI)("invites", () => {
  it("invites, previews and joins as Manager, confirming the email", async () => {
    const { ctx } = await adminWithWedding(
      "Ravi",
      "ravi@example.com",
      "ravi-weds",
    );
    const token = await invite(ctx, "lakshmi@example.com");

    expect((await listMembers(ctx)).invites).toEqual([
      expect.objectContaining({
        email: "lakshmi@example.com",
        status: "PENDING",
      }),
    ]);
    expect(await previewInvite(token)).toMatchObject({
      name: "Lakshmi",
      role: "MANAGER",
      invitedBy: "Ravi",
      wedding: { title: "Ravi's wedding", monogram: "AR" },
    });

    const joined = await join("lakshmi@example.com", token);
    const session = await getCurrentSession(
      joined.token,
      undefined,
      membershipOf,
    );
    expect(session?.context).toMatchObject({
      weddingId: ctx.weddingId,
      role: "MANAGER",
      emailVerified: true,
    });

    const after = await listMembers(ctx);
    expect(after.members.map((m) => [m.email, m.role])).toEqual([
      ["ravi@example.com", "ADMIN"],
      ["lakshmi@example.com", "MANAGER"],
    ]);
    expect(after.invites).toEqual([]);

    await expect(previewInvite(token)).rejects.toMatchObject({
      code: "TOKEN_USED",
    });
  });

  it("only the invited email can accept", async () => {
    const { ctx } = await adminWithWedding(
      "Arjun",
      "arjun@example.com",
      "arjun-weds",
    );
    const token = await invite(ctx, "meena@example.com");
    const other = await signup(
      {
        name: "Someone",
        email: "someone@example.com",
        password: "a-long-password",
      },
      client,
      undefined,
      { sendVerification: false },
    );
    await expect(
      acceptInvite(
        { id: other.result.user.id, email: "someone@example.com" },
        token,
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN", httpStatus: 403 });
  });

  it("expires after 7 days; resend gives a new link and the old one stops", async () => {
    const { ctx } = await adminWithWedding(
      "Kiran",
      "kiran@example.com",
      "kiran-weds",
    );
    const first = await invite(ctx, "vani@example.com");

    await expect(
      previewInvite(first, new Date(Date.now() + 8 * DAY)),
    ).rejects.toMatchObject({ code: "TOKEN_EXPIRED", httpStatus: 410 });

    const { invites } = await listMembers(ctx);
    const text = await printed(() =>
      resendInvite(ctx, "Kiran", invites[0]!.id),
    );
    const second = linkIn(text, "invite")!;
    await expect(previewInvite(first)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(previewInvite(second)).resolves.toMatchObject({
      email: "vani@example.com",
    });
  });

  it("inviting the same email again cancels the earlier link; cancel stops a link", async () => {
    const { ctx } = await adminWithWedding(
      "Sai",
      "sai@example.com",
      "sai-weds",
    );
    const first = await invite(ctx, "padma@example.com");
    const second = await invite(ctx, "padma@example.com");
    await expect(previewInvite(first)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    expect((await listMembers(ctx)).invites).toHaveLength(1);

    await cancelInvite(ctx, (await listMembers(ctx)).invites[0]!.id);
    await expect(previewInvite(second)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    expect((await listMembers(ctx)).invites).toEqual([]);
  });

  it("refuses to invite an existing member, and someone in another wedding can't join", async () => {
    const one = await adminWithWedding(
      "Vikram",
      "vikram@example.com",
      "vikram-weds",
    );
    const two = await adminWithWedding(
      "Rahul",
      "rahul@example.com",
      "rahul-weds",
    );

    await expect(
      createInvite(one.ctx, "Vikram", {
        name: "Vikram",
        email: "vikram@example.com",
        role: "ADMIN",
      }),
    ).rejects.toMatchObject({ code: "ALREADY_IN_WEDDING", httpStatus: 409 });

    const token = await invite(one.ctx, "rahul@example.com");
    await expect(
      acceptInvite({ id: two.ctx.userId, email: "rahul@example.com" }, token),
    ).rejects.toMatchObject({
      code: "EMAIL_IN_OTHER_WEDDING",
      httpStatus: 409,
    });
  });
});

describe.skipIf(!TEST_DB_URI)("managing members", () => {
  it("keeps at least one Admin, and a role change logs the member out", async () => {
    const admin = await adminWithWedding(
      "Naveen",
      "naveen@example.com",
      "naveen-weds",
    );

    await expect(
      updateMember(admin.ctx, admin.ctx.userId, { role: "MANAGER" }),
    ).rejects.toMatchObject({ code: "LAST_ADMIN", httpStatus: 409 });
    await expect(
      removeMember(admin.ctx, admin.ctx.userId),
    ).rejects.toMatchObject({
      code: "LAST_ADMIN",
    });

    const token = await invite(admin.ctx, "deepa@example.com");
    const deepa = await join("deepa@example.com", token);
    const deepaId = deepa.result.user.id;

    await updateMember(admin.ctx, deepaId, { role: "ADMIN" });
    expect(await getCurrentSession(deepa.token)).toBeNull();
    expect((await membershipOf(deepaId))?.role).toBe("ADMIN");

    // With two Admins, the first may now step down.
    await updateMember(admin.ctx, admin.ctx.userId, { role: "MANAGER" });
    expect((await membershipOf(admin.ctx.userId))?.role).toBe("MANAGER");
  });

  it("sets and clears a relation label without logging anyone out", async () => {
    const admin = await adminWithWedding(
      "Suresh",
      "suresh@example.com",
      "suresh-weds",
    );
    const token = await invite(admin.ctx, "uma@example.com");
    const uma = await join("uma@example.com", token);

    await updateMember(admin.ctx, uma.result.user.id, {
      relationLabel: "Bride's aunt",
    });
    let member = (await listMembers(admin.ctx)).members.find(
      (m) => m.email === "uma@example.com",
    );
    expect(member?.relationLabel).toBe("Bride's aunt");
    expect(await getCurrentSession(uma.token)).not.toBeNull();

    await updateMember(admin.ctx, uma.result.user.id, { relationLabel: "" });
    member = (await listMembers(admin.ctx)).members.find(
      (m) => m.email === "uma@example.com",
    );
    expect(member?.relationLabel).toBeNull();
  });

  it("removes a member and logs them out; strangers aren't found", async () => {
    const admin = await adminWithWedding(
      "Mohan",
      "mohan@example.com",
      "mohan-weds",
    );
    const token = await invite(admin.ctx, "gowri@example.com");
    const gowri = await join("gowri@example.com", token);

    await removeMember(admin.ctx, gowri.result.user.id);
    expect(await getCurrentSession(gowri.token)).toBeNull();
    expect(await membershipOf(gowri.result.user.id)).toBeNull();

    const outsider = await adminWithWedding(
      "Ajay",
      "ajay@example.com",
      "ajay-weds",
    );
    await expect(
      removeMember(admin.ctx, outsider.ctx.userId),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      httpStatus: 404,
    });
    await expect(removeMember(admin.ctx, "not-an-id")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

describe.skipIf(!TEST_DB_URI)("two Admins at the same moment", () => {
  it("can't both step down: one change wins and an Admin remains", async () => {
    const first = await adminWithWedding(
      "Hari",
      "hari@example.com",
      "hari-weds",
    );
    const token = await invite(first.ctx, "jaya@example.com", "ADMIN");
    const jaya = await join("jaya@example.com", token);
    const jayaId = jaya.result.user.id;

    // Each Admin demotes the other, at once.
    const results = await Promise.allSettled([
      updateMember(first.ctx, jayaId, { role: "MANAGER" }),
      updateMember({ ...first.ctx, userId: jayaId }, first.ctx.userId, {
        role: "MANAGER",
      }),
    ]);

    const failed = results.filter((r) => r.status === "rejected");
    expect(failed).toHaveLength(1);
    expect((failed[0] as PromiseRejectedResult).reason).toMatchObject({
      code: "LAST_ADMIN",
    });
    const roles = [
      (await membershipOf(first.ctx.userId))?.role,
      (await membershipOf(jayaId))?.role,
    ];
    expect(roles.filter((role) => role === "ADMIN")).toHaveLength(1);
  });

  it("can't both remove each other either", async () => {
    const first = await adminWithWedding(
      "Gopi",
      "gopi@example.com",
      "gopi-weds",
    );
    const token = await invite(first.ctx, "rani@example.com", "ADMIN");
    const rani = await join("rani@example.com", token);
    const raniId = rani.result.user.id;

    const results = await Promise.allSettled([
      removeMember(first.ctx, raniId),
      removeMember({ ...first.ctx, userId: raniId }, first.ctx.userId),
    ]);

    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    const left = (await listMembers(first.ctx)).members;
    expect(left).toHaveLength(1);
    expect(left[0]?.role).toBe("ADMIN");
  });
});
