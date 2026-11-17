import "server-only";

import { notFound, redirect } from "next/navigation";

import { readSession } from "@/lib/session";
import { getTask, tasksPolicy } from "@/modules/tasks";
import { AppError } from "@/platform/errors";
import { authorize } from "@/platform/rbac";

/**
 * The signed-in Admin or Manager (API Design "Tasks"); anyone else goes back
 * to the dashboard. The app layout already checked the session.
 */
export async function tasksContext(action: keyof typeof tasksPolicy) {
  const session = await readSession();
  const role = session?.result.role;
  const roles: readonly string[] = tasksPolicy[action];
  if (!session || !role || !roles.includes(role)) redirect("/dashboard");
  return authorize(session.context, tasksPolicy, action);
}

/** The task, or the 404 page when it isn't in this wedding. */
export async function taskOr404(
  ctx: Awaited<ReturnType<typeof tasksContext>>,
  id: string,
) {
  try {
    return await getTask(ctx, id);
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    throw err;
  }
}

/** A page's search params as URLSearchParams (repeated keys kept). */
export function toSearchParams(
  params: Record<string, string | string[] | undefined>,
): URLSearchParams {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const item of [value].flat()) {
      if (item !== undefined) search.append(key, item);
    }
  }
  return search;
}
