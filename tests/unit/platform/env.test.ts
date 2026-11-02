import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const serviceVariables = [
  "MONGODB_URI",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
  "RESEND_API_KEY",
  "JOB_SECRET",
  "SESSION_SECRET",
];

// env.ts caches what it reads, so each test loads a fresh copy.
async function loadEnv() {
  vi.resetModules();
  return import("@/platform/env");
}

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "development");
  for (const name of serviceVariables) {
    vi.stubEnv(name, "");
  }
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("server env", () => {
  it("does not throw in development when service credentials are missing", async () => {
    const env = await loadEnv();

    expect(() => env.getServerEnv()).not.toThrow();
    for (const service of [
      "mongodb",
      "r2",
      "email",
      "jobs",
      "session",
    ] as const) {
      expect(env.isConfigured(service)).toBe(false);
    }
  });

  it("rejects a missing service with SERVICE_NOT_CONFIGURED when it is required", async () => {
    const env = await loadEnv();

    // Compared by fields: resetModules gives env.ts its own copy of AppError.
    expect(() => env.requireService("mongodb")).toThrow(
      expect.objectContaining({
        name: "AppError",
        code: "SERVICE_NOT_CONFIGURED",
        httpStatus: 503,
      }),
    );
  });

  it("returns the service settings once they are set", async () => {
    vi.stubEnv(
      "MONGODB_URI",
      "mongodb+srv://user:pass@cluster.example/mmm_preview",
    );
    const env = await loadEnv();

    expect(env.isConfigured("mongodb")).toBe(true);
    expect(env.requireService("mongodb")).toEqual({
      MONGODB_URI: "mongodb+srv://user:pass@cluster.example/mmm_preview",
    });
  });

  it("treats a partly configured service as not configured", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("R2_ACCOUNT_ID", "account");
    vi.stubEnv("R2_BUCKET", "mmm-preview");
    const env = await loadEnv();

    expect(env.isConfigured("r2")).toBe(false);
    expect(console.warn).toHaveBeenCalledOnce();
  });

  it("throws for values that are set but malformed, without echoing them", async () => {
    const { parseServerEnv } = await loadEnv();

    expect(() => parseServerEnv({ MONGODB_URI: "postgres://nope" })).toThrow(
      /MONGODB_URI/,
    );
    expect(() => parseServerEnv({ SESSION_SECRET: "too-short" })).toThrow(
      /SESSION_SECRET/,
    );
    expect(() => parseServerEnv({ SESSION_SECRET: "too-short" })).not.toThrow(
      /too-short/,
    );
  });
});

describe("public env", () => {
  it("defaults the app URL outside production", async () => {
    const { parsePublicEnv } = await import("@/platform/public-env");

    expect(parsePublicEnv({}, "development")).toEqual({
      appUrl: "http://localhost:3000",
    });
  });

  it("requires a valid app URL in production", async () => {
    const { parsePublicEnv } = await import("@/platform/public-env");

    expect(() => parsePublicEnv({}, "production")).toThrow(
      /NEXT_PUBLIC_APP_URL/,
    );
    expect(() =>
      parsePublicEnv({ NEXT_PUBLIC_APP_URL: "not a url" }, "development"),
    ).toThrow(/NEXT_PUBLIC_APP_URL/);
  });
});
