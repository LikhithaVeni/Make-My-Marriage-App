import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { slugify } from "@/lib/slug";
import { getCurrentSession, login, signup, verifyEmail } from "@/modules/auth";
import {
  checkSlug,
  createWedding,
  createWeddingSchema,
  membershipOf,
} from "@/modules/wedding";

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
