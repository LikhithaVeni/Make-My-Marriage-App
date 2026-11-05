import "server-only";

import { connectDb } from "@/platform/db";
import { AppError } from "@/platform/errors";

// Per-IP rate limits from docs/API Design v1.md, counted in the `rateLimits`
// collection (docs/Database Design v1.md): one document per key and window.

export interface RateLimitRule {
  limit: number;
  windowMs: number;
}

/** Login, signup, forgot and reset: 10 per 15 minutes per IP. */
export const AUTH_RATE_LIMIT: RateLimitRule = {
  limit: 10,
  windowMs: 15 * 60_000,
};

export interface Hit {
  /** Requests so far in the current window, including this one. */
  count: number;
  windowEndsAt: Date;
}

/** Counts one request for `key` and returns the window it fell in. */
export type HitCounter = (
  key: string,
  windowMs: number,
  now: Date,
) => Promise<Hit>;

interface RateLimitDoc {
  key: string;
  count: number;
  windowEndsAt: Date;
}

const DUPLICATE_KEY = 11000;

/**
 * One atomic update per request: inside an open window the count goes up,
 * otherwise a new window starts at 1. The upsert creates the first document;
 * two first requests racing on the unique key retry once.
 */
const countInMongo: HitCounter = async (key, windowMs, now) => {
  const mongoose = await connectDb();
  // Registered as a model so its indexes are built (unique key, and a TTL
  // that removes the document when its window ends); queried through the
  // driver, because Mongoose refuses update pipelines by default.
  const RateLimit =
    mongoose.models.RateLimit ??
    mongoose.model(
      "RateLimit",
      new mongoose.Schema<RateLimitDoc>({
        key: { type: String, required: true, unique: true },
        count: { type: Number, required: true },
        windowEndsAt: { type: Date, required: true, expires: 0 },
      }),
      "rateLimits",
    );

  const open = { $gt: ["$windowEndsAt", now] };
  const update = [
    {
      $set: {
        count: { $cond: [open, { $add: ["$count", 1] }, 1] },
        windowEndsAt: {
          $cond: [open, "$windowEndsAt", new Date(now.getTime() + windowMs)],
        },
      },
    },
  ];

  for (let attempt = 0; ; attempt++) {
    try {
      const doc = await RateLimit.collection.findOneAndUpdate({ key }, update, {
        upsert: true,
        returnDocument: "after",
      });
      if (!doc) throw new Error("Rate limit upsert returned no document.");
      return {
        count: doc.count as number,
        windowEndsAt: doc.windowEndsAt as Date,
      };
    } catch (err) {
      const code = (err as { code?: unknown }).code;
      if (code !== DUPLICATE_KEY || attempt > 0) throw err;
    }
  }
};

/**
 * Counts this request and throws 429 RATE_LIMITED once `key` is over the
 * limit. `details.retryAfterSeconds` becomes the Retry-After header.
 */
export async function enforceRateLimit(
  key: string,
  rule: RateLimitRule,
  { now = new Date(), count = countInMongo } = {},
): Promise<void> {
  const hit = await count(key, rule.windowMs, now);
  if (hit.count <= rule.limit) return;

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((hit.windowEndsAt.getTime() - now.getTime()) / 1000),
  );
  throw new AppError(
    "RATE_LIMITED",
    429,
    "Too many attempts. Please wait a few minutes and try again.",
    { retryAfterSeconds },
  );
}

/**
 * The caller's IP for rate-limit keys such as "login:ip:1.2.3.4". On Vercel
 * the first X-Forwarded-For entry is the client, set by the platform.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}
