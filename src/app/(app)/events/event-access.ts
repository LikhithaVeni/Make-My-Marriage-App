import "server-only";

import { notFound, redirect } from "next/navigation";

import { readSession } from "@/lib/session";
import { eventsPolicy, getEvent } from "@/modules/events";
import { AppError } from "@/platform/errors";
import { authorize } from "@/platform/rbac";

type Action = keyof typeof eventsPolicy;

/**
 * The signed-in member, allowed to do `action` (API Design "Events"); anyone
 * else goes back to the dashboard. The app layout already checked the session.
 */
export async function eventsContext(action: Action) {
  const session = await readSession();
  const role = session?.result.role;
  const roles: readonly string[] = eventsPolicy[action];
  if (!session || !role || !roles.includes(role)) redirect("/dashboard");
  return authorize(session.context, eventsPolicy, action);
}

/** The event, or the 404 page when it isn't in this wedding. */
export async function eventOr404(
  ctx: Awaited<ReturnType<typeof eventsContext>>,
  id: string,
) {
  try {
    return await getEvent(ctx, id);
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    throw err;
  }
}

/** Whether this member's role allows `action`, for showing buttons. */
export function can(role: string, action: Action): boolean {
  const roles: readonly string[] = eventsPolicy[action];
  return roles.includes(role);
}
