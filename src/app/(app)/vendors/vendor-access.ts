import "server-only";

import { notFound, redirect } from "next/navigation";

import { readSession } from "@/lib/session";
import { paidByVendor } from "@/modules/expenses";
import { getVendor, vendorsPolicy } from "@/modules/vendors";
import { AppError } from "@/platform/errors";
import { authorize } from "@/platform/rbac";

/**
 * The signed-in Admin or Manager (API Design: vendors are open to both);
 * anyone else goes back to the dashboard.
 */
export async function vendorsContext(action: keyof typeof vendorsPolicy) {
  const session = await readSession();
  const role = session?.result.role;
  const roles: readonly string[] = vendorsPolicy[action];
  if (!session || !role || !roles.includes(role)) redirect("/dashboard");
  return authorize(session.context, vendorsPolicy, action);
}

/** The vendor with what it's been paid, or the 404 page (decision 75). */
export async function vendorOr404(
  ctx: Awaited<ReturnType<typeof vendorsContext>>,
  id: string,
) {
  try {
    return await getVendor(ctx, id, await paidByVendor(ctx));
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    throw err;
  }
}
