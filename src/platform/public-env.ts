import { z } from "zod";

// Public variables are inlined into browser bundles at build time, so this file
// must never read a secret. Each variable is read by its literal name
// (process.env.NEXT_PUBLIC_…) so that Next.js can inline it.
//
// The app's address goes into every emailed link (verify, reset, invites), so
// on Vercel it never falls back to localhost (decision 69): when
// NEXT_PUBLIC_APP_URL is missing or points at this computer, the deployment's
// own address from Vercel's system variables is used instead. Those are read
// on the server only, which is where links are built.

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

/** What parsePublicEnv reads: the app's variable and Vercel's own. */
export interface PublicEnvSource {
  NEXT_PUBLIC_APP_URL?: string;
  /** "production", "preview" or "development"; set by Vercel only. */
  VERCEL_ENV?: string;
  /** e.g. "make-my-marriage-app.vercel.app", without https://. */
  VERCEL_PROJECT_PRODUCTION_URL?: string;
  VERCEL_BRANCH_URL?: string;
  VERCEL_URL?: string;
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "0.0.0.0"]);

function isLocal(url: string): boolean {
  return LOCAL_HOSTS.has(new URL(url).hostname);
}

/** The deployment's public address on Vercel, or undefined elsewhere. */
function vercelAddress(source: PublicEnvSource): string | undefined {
  if (!source.VERCEL_ENV) return undefined;
  const host =
    source.VERCEL_ENV === "production"
      ? source.VERCEL_PROJECT_PRODUCTION_URL
      : (source.VERCEL_BRANCH_URL ?? source.VERCEL_URL);
  return host ? `https://${host}` : undefined;
}

export function parsePublicEnv(
  source: PublicEnvSource,
  nodeEnv: string | undefined,
): PublicEnv {
  const result = publicEnvSchema.safeParse(source);
  if (!result.success) {
    throw new Error(
      `Invalid public environment variables:\n${z.prettifyError(result.error)}`,
    );
  }

  // "https://x.vercel.app/" would make links like "https://x.vercel.app//invite".
  const configured = result.data.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "");
  const onVercel = vercelAddress(source);
  if (onVercel && (!configured || isLocal(configured))) {
    if (configured) {
      console.warn(
        `NEXT_PUBLIC_APP_URL points at ${configured}; using ${onVercel} for links instead.`,
      );
    }
    return { appUrl: onVercel };
  }

  if (!configured && nodeEnv === "production") {
    throw new Error("NEXT_PUBLIC_APP_URL must be set in production.");
  }
  return { appUrl: configured ?? DEFAULT_APP_URL };
}

let cached: PublicEnv | undefined;

export function getPublicEnv(): PublicEnv {
  cached ??= parsePublicEnv(
    {
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
      VERCEL_BRANCH_URL: process.env.VERCEL_BRANCH_URL,
      VERCEL_URL: process.env.VERCEL_URL,
    },
    process.env.NODE_ENV,
  );
  return cached;
}
