import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

import { getCurrentSession, SESSION_COOKIE } from "@/modules/auth";
import { membershipOf } from "@/modules/wedding";
import { authorize, type Policy } from "@/platform/rbac";

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

/**
 * For wedding routes: the signed-in member, checked against a module's
 * policy (401, 403 EMAIL_NOT_VERIFIED, 403 NO_WEDDING or 403 FORBIDDEN).
 */
export async function authorizeRequest<P extends Policy>(
  policy: P,
  action: keyof P & string,
) {
  const session = await readSession();
  const ctx = authorize(session?.context ?? null, policy, action);
  return { ctx, session: session! };
}
