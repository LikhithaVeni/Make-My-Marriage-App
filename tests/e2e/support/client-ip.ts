import { randomInt } from "node:crypto";

/**
 * Headers that make a request come from its own made-up visitor address.
 * Sign-up allows 10 per 15 minutes per address (API Design), and the whole
 * e2e suite signs up more people than that from one computer, so each test
 * sign-up gets its own allowance. The limit itself is tested in
 * tests/unit/platform/rate-limit*.test.ts. On Vercel the header is set by
 * Vercel, so real visitors can't choose it.
 */
export function ownVisitor(): Record<string, string> {
  return {
    "X-Forwarded-For": `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`,
  };
}
