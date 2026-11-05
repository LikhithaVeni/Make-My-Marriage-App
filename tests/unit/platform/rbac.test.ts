import { describe, expect, it } from "vitest";

import { AppError } from "@/platform/errors";
import { authorize, type SessionContext } from "@/platform/rbac";

const policy = {
  "guests.update": ["ADMIN", "MANAGER"],
  "guests.delete": ["ADMIN"],
} as const;

const manager: SessionContext = {
  userId: "u1",
  emailVerified: true,
  weddingId: "w1",
  role: "MANAGER",
};

function codeOf(run: () => unknown) {
  try {
    run();
  } catch (err) {
    expect(err).toBeInstanceOf(AppError);
    const error = err as AppError;
    return [error.httpStatus, error.code];
  }
  throw new Error("expected authorize to throw");
}

describe("authorize", () => {
  it("returns the wedding context when the role is allowed", () => {
    expect(authorize(manager, policy, "guests.update")).toEqual({
      userId: "u1",
      weddingId: "w1",
      role: "MANAGER",
    });
  });

  it("rejects a role the action doesn't allow", () => {
    expect(codeOf(() => authorize(manager, policy, "guests.delete"))).toEqual([
      403,
      "FORBIDDEN",
    ]);
  });

  it("rejects a caller with no session", () => {
    expect(codeOf(() => authorize(null, policy, "guests.update"))).toEqual([
      401,
      "UNAUTHENTICATED",
    ]);
  });

  it("rejects an unverified email before anything else", () => {
    const session = { ...manager, emailVerified: false };
    expect(codeOf(() => authorize(session, policy, "guests.delete"))).toEqual([
      403,
      "EMAIL_NOT_VERIFIED",
    ]);
  });

  it("rejects a user who has no wedding yet", () => {
    const session = { ...manager, weddingId: null, role: null };
    expect(codeOf(() => authorize(session, policy, "guests.update"))).toEqual([
      403,
      "NO_WEDDING",
    ]);
  });
});
