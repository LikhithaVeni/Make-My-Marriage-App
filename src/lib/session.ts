import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

import { getCurrentSession, SESSION_COOKIE } from "@/modules/auth";
import { membershipOf } from "@/modules/wedding";

/**
 * The signed-in user behind this request's session cookie, with their
 * wedding and role; null when logged out or the session has expired. For
 * pages and route handlers (it reads `cookies()`). Cached per request, so a
 * layout and its page share one lookup.
 */
export const readSession = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await getCurrentSession(token, undefined, membershipOf);
  return session ? { token, ...session } : null;
});
