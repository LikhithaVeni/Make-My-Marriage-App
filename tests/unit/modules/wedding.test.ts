import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { slugify } from "@/lib/slug";
import { getCurrentSession, login, signup, verifyEmail } from "@/modules/auth";
import {
  checkSlug,
  createWedding,
  createWeddingSchema,
  getWedding,
  membershipOf,
  updateWedding,
  updateWeddingSchema,
  weddingPolicy,
} from "@/modules/wedding";
import { authorize } from "@/platform/rbac";

import { startTestDb, TEST_DB_URI } from "../helpers/test-db";

// bcrypt at cost 12 takes a few hundred milliseconds per hash or check.
vi.setConfig({ testTimeout: 60_000 });

let db: Awaited<ReturnType<typeof startTestDb>> | undefined;

beforeAll(async () => {
  if (!TEST_DB_URI) return;
  db = await startTestDb("wedding");
}, 120_000);

afterAll(async () => {
  await db?.stop();
});

const client = { ip: "203.0.113.20", userAgent: "vitest" };

const kalisEra = {
  brideName: "Likhitha",
  groomName: "Kaushik",
  title: "KaLi's era",
  date: "2028-01-28",
  city: "Hyderabad",
  slug: "kalis-era",
};

/** Signs up, confirms the email, and returns the session's context. */
async function verifiedUser(name: string, email: string) {
  const log = vi.spyOn(console, "info").mockImplementation(() => {});
  try {
    const started = await signup(
      { name, email, password: "a-long-password" },
      client,
    );
    const link = /verify\?token=([\w-]+)/.exec(
      String(log.mock.calls[0]?.[0]),
    )?.[1];
    await verifyEmail(link!);
    const current = await getCurrentSession(started.token);
    return { token: started.token, context: current!.context };
  } finally {
    log.mockRestore();
  }
}

describe("slugify", () => {
  it("turns a wedding name into an address", () => {
    expect(slugify("KaLi's era")).toBe("kalis-era");
    expect(slugify("  Ravi weds Sneha! ")).toBe("ravi-weds-sneha");
    expect(slugify("Ānanya & Rohit")).toBe("ananya-rohit");
  });
});

describe("createWeddingSchema", () => {
  it("accepts the PRD's required fields and trims them", () => {
    const parsed = createWeddingSchema.parse({
      ...kalisEra,
      city: " Hyderabad ",
    });
    expect(parsed.city).toBe("Hyderabad");
  });

  it("rejects a past date and a malformed address", () => {
    const result = createWeddingSchema.safeParse({
      ...kalisEra,
      date: "2020-01-01",
      slug: "-Bad Slug",
    });
    const fields = result.error?.issues.map((issue) => issue.path[0]);
    expect(fields).toEqual(expect.arrayContaining(["date", "slug"]));
  });
});

describe("updateWeddingSchema", () => {
  it("accepts any one field, trimmed", () => {
    expect(updateWeddingSchema.parse({ city: " Vizag " })).toEqual({
      city: "Vizag",
    });
  });

  it("allows clearing the description and tagline, not a required field", () => {
    expect(updateWeddingSchema.parse({ description: "", tagline: "" })).toEqual(
      { description: "", tagline: "" },
    );
    const result = updateWeddingSchema.safeParse({ city: "  " });
    expect(result.error?.issues[0]).toMatchObject({
      path: ["city"],
      message: "Enter the city",
    });
  });

  it("leaves a past date to the service, which allows an unchanged one", () => {
    expect(updateWeddingSchema.safeParse({ date: "2020-01-01" }).success).toBe(
      true,
    );
    expect(updateWeddingSchema.safeParse({ date: "2020-02-30x" }).success).toBe(
      false,
    );
  });

  it("refuses a date that doesn't exist, allowing a leap day", () => {
    for (const date of [
      "2028-02-30",
      "2027-02-29",
      "2028-04-31",
      "2028-13-01",
    ]) {
      expect(
        updateWeddingSchema.safeParse({ date }).error?.issues[0]?.message,
      ).toBe("Choose a real date");
      expect(createWeddingSchema.safeParse({ ...kalisEra, date }).success).toBe(
        false,
      );
    }
    expect(updateWeddingSchema.safeParse({ date: "2028-02-29" }).success).toBe(
      true,
    );
  });

  it("refuses an empty change and a malformed address", () => {
    expect(updateWeddingSchema.safeParse({}).error?.issues[0]?.message).toBe(
      "Nothing to change",
    );
    expect(updateWeddingSchema.safeParse({ slug: "No Spaces" }).success).toBe(
      false,
    );
  });
});

describe.skipIf(!TEST_DB_URI)("createWedding", () => {
  it("creates the wedding with the caller as Admin and updates their sessions", async () => {
    const { token, context } = await verifiedUser(
      "Likhitha",
      "likhitha@example.com",
    );

    const created = await createWedding(context, kalisEra);
    expect(created.role).toBe("ADMIN");
    expect(created.wedding).toMatchObject({
      title: "KaLi's era",
      slug: "kalis-era",
      tagline: "invite you to celebrate with us",
      website: { published: false, showEventsPublicly: false },
    });

    // The existing session now points at the wedding.
    const current = await getCurrentSession(token, undefined, membershipOf);
    expect(current?.context).toMatchObject({
      weddingId: created.wedding.id,
      role: "ADMIN",
    });
    expect(current?.result.wedding).toEqual({
      id: created.wedding.id,
      title: "KaLi's era",
      date: "2028-01-28",
      slug: "kalis-era",
      monogram: "LK",
    });

    // A new log in finds it too.
    const again = await login(
      { email: "likhitha@example.com", password: "a-long-password" },
      client,
      undefined,
      membershipOf,
    );
    expect(again.result.role).toBe("ADMIN");
    expect(again.result.wedding?.title).toBe("KaLi's era");
  });

  it("allows only one wedding per user", async () => {
    const { token } = await verifiedUser("Ravi", "ravi.w@example.com");
    const before = (await getCurrentSession(token))!.context;
    await createWedding(before, { ...kalisEra, slug: "ravi-weds-sneha" });

    const after = (await getCurrentSession(token))!.context;
    await expect(
      createWedding(after, { ...kalisEra, slug: "another-one" }),
    ).rejects.toMatchObject({ code: "ALREADY_IN_WEDDING", httpStatus: 409 });
    // Even with a stale session that doesn't know about the wedding yet.
    await expect(
      createWedding(before, { ...kalisEra, slug: "yet-another" }),
    ).rejects.toMatchObject({ code: "ALREADY_IN_WEDDING" });
  });

  it("refuses a taken address and suggests free ones", async () => {
    const { context } = await verifiedUser("Sneha", "sneha.w@example.com");
    await expect(createWedding(context, kalisEra)).rejects.toMatchObject({
      code: "SLUG_TAKEN",
      httpStatus: 409,
      details: {
        suggestions: ["kalis-era-2028", "kalis-era-hyderabad", "kalis-era-2"],
      },
    });

    expect(await checkSlug("kalis-era")).toMatchObject({ available: false });
    expect(await checkSlug("kalis-era-2028")).toEqual({
      slug: "kalis-era-2028",
      available: true,
      suggestions: [],
    });
  });

  it("needs a confirmed email", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    const started = await signup(
      { name: "Arun", email: "arun@example.com", password: "a-long-password" },
      client,
    );
    log.mockRestore();
    const { context } = (await getCurrentSession(started.token))!;
    await expect(
      createWedding(context, { ...kalisEra, slug: "arun-weds" }),
    ).rejects.toMatchObject({ code: "EMAIL_NOT_VERIFIED", httpStatus: 403 });
  });
});

describe.skipIf(!TEST_DB_URI)("updateWedding", () => {
  /** A verified Admin with their own wedding, as the routes would see them. */
  async function adminOf(slug: string, email: string) {
    const { token, context } = await verifiedUser("Admin", email);
    await createWedding(context, { ...kalisEra, slug });
    const current = (await getCurrentSession(token, undefined, membershipOf))!;
    return {
      token,
      ctx: authorize(current.context, weddingPolicy, "wedding.update"),
    };
  }

  it("saves only the fields sent, and the session sees the new name", async () => {
    const { token, ctx } = await adminOf("edit-me", "edit.admin@example.com");

    const updated = await updateWedding(ctx, {
      title: "Likhitha & Kaushik",
      brideName: "Likhitha M",
      description: "Two families, one big week.",
    });
    expect(updated).toMatchObject({
      title: "Likhitha & Kaushik",
      brideName: "Likhitha M",
      groomName: "Kaushik",
      city: "Hyderabad",
      slug: "edit-me",
      description: "Two families, one big week.",
    });
    expect(await getWedding(ctx)).toEqual(updated);

    const current = await getCurrentSession(token, undefined, membershipOf);
    expect(current?.result.wedding).toMatchObject({
      title: "Likhitha & Kaushik",
      monogram: "LK",
    });

    // An empty description clears it; an empty tagline is the default again.
    await updateWedding(ctx, { tagline: "request your presence" });
    const cleared = await updateWedding(ctx, { description: "", tagline: "" });
    expect(cleared.description).toBeNull();
    expect(cleared.tagline).toBe("invite you to celebrate with us");
  });

  it("refuses a new past date but keeps an old one editable", async () => {
    const { ctx } = await adminOf("after-the-day", "past.admin@example.com");
    const afterTheWedding = new Date("2028-02-10T06:00:00Z");

    // The wedding (28 Jan 2028) is over; other details can still change.
    await expect(
      updateWedding(
        ctx,
        { city: "Vizag", date: "2028-01-28" },
        afterTheWedding,
      ),
    ).resolves.toMatchObject({ city: "Vizag", date: "2028-01-28" });

    await expect(
      updateWedding(ctx, { date: "2028-02-01" }, afterTheWedding),
    ).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
      httpStatus: 400,
      details: { fields: { date: "The wedding date can't be in the past" } },
    });
  });

  it("moves the website address, refusing one that's taken", async () => {
    const { ctx } = await adminOf("old-address", "slug.admin@example.com");
    await adminOf("someone-elses", "other.admin@example.com");

    await expect(
      updateWedding(ctx, { slug: "someone-elses" }),
    ).rejects.toMatchObject({
      code: "SLUG_TAKEN",
      httpStatus: 409,
      details: { suggestions: expect.arrayContaining(["someone-elses-2028"]) },
    });

    // Sending its own address again is fine.
    await expect(
      updateWedding(ctx, { slug: "old-address" }),
    ).resolves.toMatchObject({ slug: "old-address" });

    await expect(
      updateWedding(ctx, { slug: "new-address" }),
    ).resolves.toMatchObject({ slug: "new-address" });
    expect(await checkSlug("old-address")).toMatchObject({ available: true });
    expect(await checkSlug("new-address")).toMatchObject({ available: false });
  });

  it("is for Admins only", async () => {
    const { token } = await adminOf("roles-check", "roles.admin@example.com");
    const { context } = (await getCurrentSession(
      token,
      undefined,
      membershipOf,
    ))!;
    expect(() =>
      authorize(
        { ...context, role: "MANAGER" },
        weddingPolicy,
        "wedding.update",
      ),
    ).toThrow(expect.objectContaining({ code: "FORBIDDEN" }));
    expect(
      authorize({ ...context, role: "MANAGER" }, weddingPolicy, "wedding.view"),
    ).toMatchObject({ role: "MANAGER" });
  });
});
