import { type APIRequestContext, expect, test } from "@playwright/test";

import { E2E_DB_URI, E2E_USER } from "./support/e2e-db";
import { closeDb, seedInvite, seedOtherWedding } from "./support/invites";
import { logIn } from "./support/login";

// Members and invites (PRD F2, "Rules", "Member management"). The steps
// share the seeded wedding, so they run in order.
test.describe.configure({ mode: "serial" });
test.skip(!E2E_DB_URI, "needs MONGODB_TEST_URI for a seeded account");
test.afterAll(closeDb);

const csrf = { "X-Requested-With": "mmm" };
const PASSWORD = "e2e-family-password";

async function newContext(
  playwright: {
    request: { newContext: (o: object) => Promise<APIRequestContext> };
  },
  baseURL: string | undefined,
) {
  return playwright.request.newContext({ baseURL });
}

test("an Admin invites by email; the invite is listed, then cancelled", async ({
  request,
}) => {
  await logIn(request);

  const created = await request.post("/api/v1/invites", {
    headers: csrf,
    data: {
      name: "Padma",
      email: "padma.e2e@example.com",
      role: "MANAGER",
      relationLabel: "Bride's aunt",
    },
  });
  expect(created.status()).toBe(201);
  const invite = (await created.json()).data;
  expect(invite).toMatchObject({ status: "PENDING", role: "MANAGER" });

  const members = (await (await request.get("/api/v1/members")).json()).data;
  expect(members.members.map((m: { email: string }) => m.email)).toContain(
    E2E_USER.email,
  );
  expect(members.invites).toContainEqual(
    expect.objectContaining({
      email: "padma.e2e@example.com",
      relationLabel: "Bride's aunt",
    }),
  );

  const html = await (await request.get("/settings/members")).text();
  expect(html).toContain("Wedding members");
  expect(html).toContain("padma.e2e@example.com");

  expect(
    (
      await request.delete(`/api/v1/invites/${invite.id}`, { headers: csrf })
    ).status(),
  ).toBe(204);
  const after = (await (await request.get("/api/v1/members")).json()).data;
  expect(after.invites).toEqual([]);
});

test("the invite link shows the wedding; signing up through it joins as Manager", async ({
  playwright,
  baseURL,
  request,
}) => {
  const token = await seedInvite({
    email: "meena.e2e@example.com",
    name: "Meena",
  });

  const visitor = await newContext(playwright, baseURL);
  const page = await (await visitor.get(`/invite/${token}`)).text();
  expect(page).toContain("You&#x27;re invited, Meena");
  expect(page).toContain("E2E weds Test");
  expect(page).toContain("meena.e2e@example.com");

  // The invited email is the only one that can use the link.
  const wrongEmail = await visitor.post(`/api/v1/auth/signup?invite=${token}`, {
    headers: csrf,
    data: {
      name: "Meena",
      email: "someone.else@example.com",
      password: PASSWORD,
    },
  });
  expect(wrongEmail.status()).toBe(403);

  const joined = await visitor.post(`/api/v1/auth/signup?invite=${token}`, {
    headers: csrf,
    data: { name: "Meena", email: "meena.e2e@example.com", password: PASSWORD },
  });
  expect(joined.status()).toBe(201);
  expect((await joined.json()).data).toMatchObject({
    user: { email: "meena.e2e@example.com", emailVerified: true },
    wedding: { title: "E2E weds Test" },
    role: "MANAGER",
  });

  // A Manager reaches the dashboard but not Settings or the members API.
  expect((await visitor.get("/dashboard", { maxRedirects: 0 })).status()).toBe(
    200,
  );
  const settings = await visitor.get("/settings/members", { maxRedirects: 0 });
  expect(settings.status()).toBe(307);
  expect(settings.headers().location).toContain("/dashboard");
  expect((await visitor.get("/api/v1/members")).status()).toBe(403);
  expect(
    (
      await visitor.post("/api/v1/invites", {
        headers: csrf,
        data: { name: "X", email: "x.e2e@example.com", role: "ADMIN" },
      })
    ).status(),
  ).toBe(403);

  // The link works once.
  const again = await (await visitor.get(`/invite/${token}`)).text();
  expect(again).toContain("This invite has been used");

  // The Admin sees Meena, removes her, and her session ends at once.
  await logIn(request);
  const { members } = (await (await request.get("/api/v1/members")).json())
    .data;
  const meena = members.find(
    (m: { email: string }) => m.email === "meena.e2e@example.com",
  );
  expect(meena).toMatchObject({ role: "MANAGER" });
  expect(
    (
      await request.delete(`/api/v1/members/${meena.userId}`, { headers: csrf })
    ).status(),
  ).toBe(204);
  expect((await visitor.get("/api/v1/auth/me")).status()).toBe(401);
  await visitor.dispose();
});

test("someone with an account logs in from the invite and joins", async ({
  playwright,
  baseURL,
}) => {
  const visitor = await newContext(playwright, baseURL);
  // An existing account without a wedding (and not yet verified).
  expect(
    (
      await visitor.post("/api/v1/auth/signup", {
        headers: csrf,
        data: {
          name: "Ravi",
          email: "ravi.e2e@example.com",
          password: PASSWORD,
        },
      })
    ).status(),
  ).toBe(201);
  const token = await seedInvite({
    email: "ravi.e2e@example.com",
    name: "Ravi",
  });

  const page = await (await visitor.get(`/invite/${token}`)).text();
  expect(page).toContain("Welcome, Ravi");
  expect(page).toContain("Join E2E weds Test");

  const accepted = await visitor.post(`/api/v1/invites/${token}/accept`, {
    headers: csrf,
  });
  expect(accepted.status()).toBe(200);
  const me = (await (await visitor.get("/api/v1/auth/me")).json()).data;
  expect(me).toMatchObject({
    user: { emailVerified: true },
    wedding: { title: "E2E weds Test" },
    role: "MANAGER",
  });
  await visitor.dispose();
});

test("expired, unknown, wrong-account and other-wedding links each say why", async ({
  request,
  playwright,
  baseURL,
}) => {
  const visitor = await newContext(playwright, baseURL);
  const expired = await seedInvite({
    email: "late.e2e@example.com",
    expiresAt: new Date(Date.now() - 60_000),
  });
  expect(await (await visitor.get(`/invite/${expired}`)).text()).toContain(
    "This invite has expired",
  );
  expect(
    await (await visitor.get("/invite/not-a-real-token")).text(),
  ).toContain("This invite link isn&#x27;t valid");
  await visitor.dispose();

  // The seeded Admin opens an invite meant for someone else…
  await logIn(request);
  const forOther = await seedInvite({ email: "not.me.e2e@example.com" });
  expect(await (await request.get(`/invite/${forOther}`)).text()).toContain(
    "This invite is for someone else",
  );

  // …and one for themselves, to another wedding: one wedding per person.
  const otherWedding = await seedOtherWedding();
  const toOther = await seedInvite({
    email: E2E_USER.email,
    weddingId: otherWedding,
  });
  expect(await (await request.get(`/invite/${toOther}`)).text()).toContain(
    "You already belong to a wedding",
  );
  const refused = await request.post(`/api/v1/invites/${toOther}/accept`, {
    headers: csrf,
  });
  expect(refused.status()).toBe(409);
  expect((await refused.json()).error.code).toBe("EMAIL_IN_OTHER_WEDDING");
});

test("the only Admin can't step down or be removed", async ({ request }) => {
  await logIn(request);
  const me = (await (await request.get("/api/v1/auth/me")).json()).data;

  const demote = await request.patch(`/api/v1/members/${me.user.id}`, {
    headers: csrf,
    data: { role: "MANAGER" },
  });
  expect(demote.status()).toBe(409);
  expect((await demote.json()).error.code).toBe("LAST_ADMIN");

  const leave = await request.delete(`/api/v1/members/${me.user.id}`, {
    headers: csrf,
  });
  expect(leave.status()).toBe(409);

  // Changes without the CSRF header are refused.
  expect(
    (
      await request.patch(`/api/v1/members/${me.user.id}`, {
        data: { relationLabel: "Groom" },
      })
    ).status(),
  ).toBe(403);
});
