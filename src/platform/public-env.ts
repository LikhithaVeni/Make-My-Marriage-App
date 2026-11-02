import { z } from "zod";

// Public variables are inlined into browser bundles at build time, so this file
// must never read a secret. Each variable is read by its literal name
// (process.env.NEXT_PUBLIC_…) so that Next.js can inline it.

const DEFAULT_APP_URL = "http://localhost:3000";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.url().optional(),
  ),
});

export interface PublicEnv {
  appUrl: string;
}

export function parsePublicEnv(
  source: Record<string, string | undefined>,
  nodeEnv: string | undefined,
): PublicEnv {
  const result = publicEnvSchema.safeParse(source);
  if (!result.success) {
    throw new Error(
      `Invalid public environment variables:\n${z.prettifyError(result.error)}`,
    );
  }

  const appUrl = result.data.NEXT_PUBLIC_APP_URL;
  if (!appUrl && nodeEnv === "production") {
    throw new Error("NEXT_PUBLIC_APP_URL must be set in production.");
  }
  return { appUrl: appUrl ?? DEFAULT_APP_URL };
}

let cached: PublicEnv | undefined;

export function getPublicEnv(): PublicEnv {
  cached ??= parsePublicEnv(
    { NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL },
    process.env.NODE_ENV,
  );
  return cached;
}
