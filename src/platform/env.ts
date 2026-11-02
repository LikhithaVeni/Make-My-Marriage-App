import "server-only";

import { z } from "zod";

import { AppError } from "@/platform/errors";

// Server-only configuration. Importing this file from a Client Component fails
// the build. Browser-safe values live in public-env.ts.
//
// Missing service credentials never throw: the service is "not configured" and
// code that needs it calls requireService(), which fails with
// 503 SERVICE_NOT_CONFIGURED. Values that are present but malformed always
// throw. Variables are read on first use, not at import, so `next build` works
// without secrets.

const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (value) => (value === "" ? undefined : value),
    schema.optional(),
  );

const secret = z.string().min(32, "Must be at least 32 characters");

const serverEnvSchema = z.object({
  MONGODB_URI: optional(
    z
      .string()
      .regex(
        /^mongodb(\+srv)?:\/\//,
        "Must start with mongodb:// or mongodb+srv://",
      ),
  ),
  R2_ACCOUNT_ID: optional(z.string()),
  R2_ACCESS_KEY_ID: optional(z.string()),
  R2_SECRET_ACCESS_KEY: optional(z.string()),
  R2_BUCKET: optional(z.string()),
  RESEND_API_KEY: optional(z.string()),
  JOB_SECRET: optional(secret),
  SESSION_SECRET: optional(secret),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

const services = {
  mongodb: ["MONGODB_URI"],
  r2: [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET",
  ],
  email: ["RESEND_API_KEY"],
  jobs: ["JOB_SECRET"],
  session: ["SESSION_SECRET"],
} as const satisfies Record<string, readonly (keyof ServerEnv)[]>;

export type Service = keyof typeof services;

/** A service's variables, all guaranteed to be set. */
export type ServiceConfig<S extends Service> = {
  [K in (typeof services)[S][number]]: string;
};

export function parseServerEnv(
  source: Record<string, string | undefined>,
): ServerEnv {
  const result = serverEnvSchema.safeParse(source);
  if (!result.success) {
    // prettifyError lists variable names and rules, never the values.
    throw new Error(
      `Invalid environment variables:\n${z.prettifyError(result.error)}`,
    );
  }

  for (const [service, keys] of Object.entries(services)) {
    const set = keys.filter((key) => result.data[key] !== undefined);
    if (set.length > 0 && set.length < keys.length) {
      console.warn(
        `${service} is partly configured (${set.join(", ")} set); treating it as not configured.`,
      );
    }
  }
  return result.data;
}

let cached: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  cached ??= parseServerEnv(process.env);
  return cached;
}

export function isConfigured(
  service: Service,
  env: ServerEnv = getServerEnv(),
): boolean {
  return services[service].every((key) => env[key] !== undefined);
}

export function requireService<S extends Service>(
  service: S,
  env: ServerEnv = getServerEnv(),
): ServiceConfig<S> {
  if (!isConfigured(service, env)) {
    throw new AppError(
      "SERVICE_NOT_CONFIGURED",
      503,
      "This feature is not available right now.",
      { service },
    );
  }
  return Object.fromEntries(
    services[service].map((key) => [key, env[key]]),
  ) as ServiceConfig<S>;
}
