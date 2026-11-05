import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  getCurrentSession,
  login,
  loginSchema,
  logout,
  requestPasswordReset,
  resendVerificationEmail,
  resetPassword,
  SESSION_TTL_MS,
  signup,
  signupSchema,
  verifyEmail,
} from "@/modules/auth";

import { startTestDb, TEST_DB_URI } from "../helpers/test-db";

// bcrypt at cost 12 takes a few hundred milliseconds per hash or check.
vi.setConfig({ testTimeout: 60_000 });

let db: Awaited<ReturnType<typeof startTestDb>> | undefined;

beforeAll(async () => {
  if (!TEST_DB_URI) return;
  db = await startTestDb("auth");
}, 120_000);

afterAll(async () => {
  await db?.stop();
});

const client = { ip: "203.0.113.9", userAgent: "vitest" };
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const venu = { email: "venu@example.com", password: "a-long-password" };

/** Signs up without printing the verification email. */
async function quietSignup(name: string, email: string, password: string) {
  const log = vi.spyOn(console, "info").mockImplementation(() => {});
  try {
    return await signup({ name, email, password }, client);
  } finally {
    log.mockRestore();
  }
}

describe("signupSchema and loginSchema", () => {
  it("trims the name and lowercases the email", () => {
    expect(
      signupSchema.parse({
        name: "  Venu ",
        email: " Venu@Example.com ",
        password: "a-long-password",
      }),
    ).toEqual({
      name: "Venu",
      email: "venu@example.com",
      password: "a-long-password",
    });
  });

  it("applies the shared field rules", () => {
    const result = signupSchema.safeParse({
      name: "",
      email: "venu",
      password: "short",
    });
    const fields = result.error?.issues.map((issue) => issue.path.join("."));
    expect(fields).toEqual(expect.arrayContaining(["name", "email"]));
  });

  it("rejects a password equal to the email", () => {
    const result = signupSchema.safeParse({
      name: "Venu",
      email: "venu.reddy@example.com",
      password: "Venu.Reddy@example.com",
    });
    expect(result.error?.issues[0]?.path).toEqual(["password"]);
  });

  it("needs a password to log in", () => {
    const result = loginSchema.safeParse({ email: venu.email, password: "" });
    expect(result.success).toBe(false);
  });
});

describe.skipIf(!TEST_DB_URI)("signup", () => {
  it("creates an unverified user, emails a verification link and starts a session", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    const started = await signup({ name: "Venu", ...venu }, client);
    const printed = String(log.mock.calls[0]?.[0]);
    log.mockRestore();

    expect(started.result).toEqual({
      user: {
        id: expect.any(String),
        name: "Venu",
        email: venu.email,
        emailVerified: false,
      },
      wedding: null,
      role: null,
    });
    expect(started.token).toMatch(/^[\w-]{43}$/);
    expect(printed).toContain(`To: ${venu.email}`);
    expect(printed).toMatch(/\/verify\?token=[\w-]{43}/);
  });

  it("refuses an email that already has an account", async () => {
    await expect(
      signup(
        { name: "Venu", email: venu.email, password: "another-password" },
        client,
      ),
    ).rejects.toMatchObject({ code: "EMAIL_TAKEN", httpStatus: 409 });
  });
});

describe.skipIf(!TEST_DB_URI)("login", () => {
  it("starts a session with the right password", async () => {
    const started = await login(venu, client);
    expect(started.result.user.email).toBe(venu.email);
  });

  it("gives the same answer for a wrong password and an unknown email", async () => {
    await expect(
      login({ email: venu.email, password: "wrong-password" }, client),
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS", httpStatus: 401 });
    await expect(
      login(
        { email: "nobody@example.com", password: "wrong-password" },
        client,
      ),
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS", httpStatus: 401 });
  });

  it("locks the account for 15 minutes after 5 wrong passwords in a row", async () => {
    const email = "karthik@example.com";
    const password = "karthik-password";
    await quietSignup("Karthik", email, password);
    const now = new Date();
    const wrong = { email, password: "wrong-password" };

    for (let i = 0; i < 4; i++) {
      await expect(login(wrong, client, now)).rejects.toMatchObject({
        code: "INVALID_CREDENTIALS",
      });
    }
    await expect(login(wrong, client, now)).rejects.toMatchObject({
      code: "ACCOUNT_LOCKED",
      httpStatus: 423,
      details: { retryAfterSeconds: 900 },
    });

    // Even the right password waits out the lock.
    const during = new Date(now.getTime() + 14 * MINUTE);
    await expect(
      login({ email, password }, client, during),
    ).rejects.toMatchObject({ code: "ACCOUNT_LOCKED" });

    const after = new Date(now.getTime() + 15 * MINUTE + 1000);
    await expect(
      login({ email, password }, client, after),
    ).resolves.toBeTruthy();
  });

  it("clears earlier failures after a successful login", async () => {
    const email = "priya@example.com";
    const password = "priya-password";
    await quietSignup("Priya", email, password);

    for (let i = 0; i < 4; i++) {
      await login({ email, password: "wrong" }, client).catch(() => {});
    }
    await login({ email, password }, client);
    await expect(
      login({ email, password: "wrong" }, client),
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
  });
});

describe.skipIf(!TEST_DB_URI)("sessions", () => {
  it("loads the session behind a cookie value, until logout", async () => {
    const { token } = await login(venu, client);

    const current = await getCurrentSession(token);
    expect(current?.context).toEqual({
      userId: expect.any(String),
      emailVerified: false,
      weddingId: null,
      role: null,
    });
    expect(current?.result.user.name).toBe("Venu");

    await logout(token);
    expect(await getCurrentSession(token)).toBeNull();
  });

  it("ignores unknown and expired cookie values", async () => {
    expect(await getCurrentSession("not-a-real-session")).toBeNull();

    const now = new Date();
    const { token } = await login(venu, client, now);
    const afterExpiry = new Date(now.getTime() + SESSION_TTL_MS + 1000);
    expect(await getCurrentSession(token, afterExpiry)).toBeNull();
  });

  it("slides the 30-day expiry forward at most once a day", async () => {
    const now = new Date();
    const { token } = await login(venu, client, now);

    const anHourOn = new Date(now.getTime() + 60 * MINUTE);
    expect((await getCurrentSession(token, anHourOn))?.extendedTo).toBeNull();

    const twoDaysOn = new Date(now.getTime() + 2 * DAY);
    expect((await getCurrentSession(token, twoDaysOn))?.extendedTo).toEqual(
      new Date(twoDaysOn.getTime() + SESSION_TTL_MS),
    );
  });
});

/** Signs up and returns the token from the printed verification email. */
async function signupWithLink(name: string, email: string) {
  const log = vi.spyOn(console, "info").mockImplementation(() => {});
  try {
    const started = await signup(
      { name, email, password: "a-long-password" },
      client,
    );
    const printed = log.mock.calls.map((call) => String(call[0])).join("\n");
    const token = /verify\?token=([\w-]+)/.exec(printed)?.[1];
    if (!token) throw new Error("No verification link was printed.");
    return { started, token };
  } finally {
    log.mockRestore();
  }
}

describe.skipIf(!TEST_DB_URI)("email verification", () => {
  it("confirms the email once, then refuses the same link", async () => {
    const { started, token } = await signupWithLink(
      "Lakshmi",
      "lakshmi@example.com",
    );

    await verifyEmail(token);
    const current = await getCurrentSession(started.token);
    expect(current?.context.emailVerified).toBe(true);
    expect(current?.result.user.emailVerified).toBe(true);

    await expect(verifyEmail(token)).rejects.toMatchObject({
      code: "TOKEN_USED",
      httpStatus: 410,
    });
  });

  it("refuses an unknown link and one older than 24 hours", async () => {
    await expect(verifyEmail("not-a-real-link")).rejects.toMatchObject({
      code: "NOT_FOUND",
      httpStatus: 404,
    });

    const { token } = await signupWithLink("Ravi", "ravi@example.com");
    const tomorrow = new Date(Date.now() + DAY + 1000);
    await expect(verifyEmail(token, tomorrow)).rejects.toMatchObject({
      code: "TOKEN_EXPIRED",
      httpStatus: 410,
    });
  });

  it("resends a working link, but not once the email is confirmed", async () => {
    const { started } = await signupWithLink("Sneha", "sneha@example.com");
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    await resendVerificationEmail(started.result.user.id);
    const resent = /verify\?token=([\w-]+)/.exec(
      String(log.mock.calls[0]?.[0]),
    )?.[1];
    expect(resent).toBeDefined();

    await verifyEmail(resent!);
    log.mockClear();
    await resendVerificationEmail(started.result.user.id);
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });
});

/** Asks for a reset and returns the token from the printed email, if any. */
async function resetLinkFor(email: string) {
  const log = vi.spyOn(console, "info").mockImplementation(() => {});
  try {
    await requestPasswordReset(email);
    const printed = log.mock.calls.map((call) => String(call[0])).join("\n");
    return /reset\?token=([\w-]+)/.exec(printed)?.[1];
  } finally {
    log.mockRestore();
  }
}

describe.skipIf(!TEST_DB_URI)("password reset", () => {
  it("sends nothing for an unknown email", async () => {
    expect(await resetLinkFor("nobody-here@example.com")).toBeUndefined();
  });

  it("sets the new password, ends every session and logs in here", async () => {
    const email = "meera@example.com";
    await quietSignup("Meera", email, "old-password-123");
    const other = await login({ email, password: "old-password-123" }, client);

    const token = await resetLinkFor(email);
    const started = await resetPassword(token!, "new-password-456", client);
    expect(started.result.user.email).toBe(email);
    // The link also proves the email address.
    expect(started.result.user.emailVerified).toBe(true);

    expect(await getCurrentSession(other.token)).toBeNull();
    expect(await getCurrentSession(started.token)).not.toBeNull();
    await expect(
      login({ email, password: "old-password-123" }, client),
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
    await expect(
      login({ email, password: "new-password-456" }, client),
    ).resolves.toBeTruthy();

    await expect(
      resetPassword(token!, "another-password-789", client),
    ).rejects.toMatchObject({ code: "TOKEN_USED", httpStatus: 410 });
  });

  it("honours only the newest link, for one hour", async () => {
    const email = "kavya@example.com";
    await quietSignup("Kavya", email, "kavya-password-1");

    const first = await resetLinkFor(email);
    const second = await resetLinkFor(email);
    await expect(
      resetPassword(first!, "a-fresh-password", client),
    ).rejects.toMatchObject({ code: "TOKEN_USED" });

    const later = new Date(Date.now() + 61 * MINUTE);
    await expect(
      resetPassword(second!, "a-fresh-password", client, later),
    ).rejects.toMatchObject({ code: "TOKEN_EXPIRED", httpStatus: 410 });
  });

  it("applies the password rules, keeping the link usable", async () => {
    const email = "anand@example.com";
    await quietSignup("Anand", email, "anand-password-1");
    const token = await resetLinkFor(email);

    await expect(resetPassword(token!, email, client)).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
      details: { fields: { password: expect.any(String) } },
    });
    await expect(
      resetPassword(token!, "a-good-new-password", client),
    ).resolves.toBeTruthy();
  });

  it("unlocks a locked account", async () => {
    const email = "gita@example.com";
    await quietSignup("Gita", email, "gita-password-1");
    for (let i = 0; i < 5; i++) {
      await login({ email, password: "wrong" }, client).catch(() => {});
    }
    await expect(
      login({ email, password: "gita-password-1" }, client),
    ).rejects.toMatchObject({ code: "ACCOUNT_LOCKED" });

    const token = await resetLinkFor(email);
    await resetPassword(token!, "gita-password-2", client);
    await expect(
      login({ email, password: "gita-password-2" }, client),
    ).resolves.toBeTruthy();
  });
});
