import { describe, expect, it } from "vitest";

import {
  authAlert,
  type AuthSession,
  pathAfterAuth,
  safeNext,
} from "@/components/auth/auth-client";
import { ApiError } from "@/lib/api-client";

const session = (overrides: Partial<AuthSession> = {}): AuthSession => ({
  user: { id: "u1", name: "Venu", email: "v@example.com", emailVerified: true },
  wedding: {
    id: "w1",
    title: "KaLi's era",
    date: "2028-01-28",
    slug: "kalis-era",
    monogram: "LK",
  },
  role: "ADMIN",
  ...overrides,
});

describe("pathAfterAuth (PRD flow F1)", () => {
  it("sends unverified accounts to verify their email first", () => {
    const user = { ...session().user, emailVerified: false };
    expect(pathAfterAuth(session({ user, wedding: null }))).toBe("/verify");
  });

  it("sends a verified user with no wedding to create one", () => {
    expect(pathAfterAuth(session({ wedding: null, role: null }))).toBe(
      "/wedding/new",
    );
  });

  it("sends everyone else to the dashboard", () => {
    expect(pathAfterAuth(session())).toBe("/dashboard");
  });

  it("returns to the page asked for, once fully set up", () => {
    expect(pathAfterAuth(session(), "/tasks?mine=1")).toBe("/tasks?mine=1");
    expect(
      pathAfterAuth(session({ wedding: null, role: null }), "/tasks"),
    ).toBe("/wedding/new");
  });
});

describe("pathAfterAuth with an invite link (PRD F2)", () => {
  it("returns to the invite before verify or Create wedding", () => {
    const user = { ...session().user, emailVerified: false };
    expect(
      pathAfterAuth(
        session({ user, wedding: null, role: null }),
        "/invite/abc",
      ),
    ).toBe("/invite/abc");
  });
});

describe("safeNext", () => {
  it("keeps paths on this site", () => {
    expect(safeNext("/dashboard")).toBe("/dashboard");
  });

  it("refuses anything that could leave the site", () => {
    for (const next of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "dashboard",
      "",
      null,
    ]) {
      expect(safeNext(next)).toBeNull();
    }
  });
});

describe("authAlert", () => {
  it("uses one message for a wrong email or password", () => {
    const error = new ApiError("INVALID_CREDENTIALS", "x", 401);
    expect(authAlert(error).title).toBe("Incorrect email or password.");
  });

  it("explains a locked account", () => {
    const error = new ApiError("ACCOUNT_LOCKED", "x", 423);
    expect(authAlert(error).body).toContain("locked for 15 minutes");
  });

  it("says accounts aren't on yet while the API is missing", () => {
    expect(authAlert(new ApiError("NOT_FOUND", "x", 404)).title).toBe(
      "Accounts aren't switched on yet.",
    );
  });

  it("falls back to a generic message", () => {
    expect(authAlert(new Error("boom")).title).toBe("Something went wrong.");
  });
});
