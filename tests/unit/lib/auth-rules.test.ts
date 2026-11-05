import { describe, expect, it } from "vitest";

import {
  emailError,
  nameError,
  newPasswordError,
  passwordEnteredError,
} from "@/lib/auth-rules";

describe("nameError", () => {
  it("needs a name of at most 80 characters", () => {
    expect(nameError("Venu")).toBeNull();
    expect(nameError("   ")).toBe("Enter your name");
    expect(nameError("a".repeat(81))).toBe("Use at most 80 characters");
  });
});

describe("emailError", () => {
  it("accepts a plausible address, ignoring surrounding spaces", () => {
    expect(emailError(" venu@example.com ")).toBeNull();
  });

  it("explains what is wrong", () => {
    expect(emailError("")).toBe("Enter your email address");
    expect(emailError("priya.sharma")).toBe("Enter a valid email address");
  });
});

describe("passwordEnteredError", () => {
  it("only needs something to try when logging in", () => {
    expect(passwordEnteredError("x")).toBeNull();
    expect(passwordEnteredError("")).toBe("Enter your password");
  });
});

describe("newPasswordError (API Design: 10–128, not the email)", () => {
  const email = "venu@example.com";

  it("accepts 10 to 128 characters", () => {
    expect(newPasswordError("a".repeat(10), email)).toBeNull();
    expect(newPasswordError("a".repeat(128), email)).toBeNull();
  });

  it("rejects too short, too long and empty", () => {
    expect(newPasswordError("", email)).toBe("Choose a password");
    expect(newPasswordError("a".repeat(9), email)).toBe(
      "Use at least 10 characters",
    );
    expect(newPasswordError("a".repeat(129), email)).toBe(
      "Use at most 128 characters",
    );
  });

  it("rejects the email address, in any case", () => {
    expect(newPasswordError("Venu@Example.com", email)).toBe(
      "Don't use your email address as your password",
    );
  });
});
