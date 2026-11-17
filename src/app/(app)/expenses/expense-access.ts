import "server-only";

import { notFound, redirect } from "next/navigation";

import { readSession } from "@/lib/session";
import { expensesPolicy, getExpense } from "@/modules/expenses";
import { AppError } from "@/platform/errors";
import { authorize } from "@/platform/rbac";

/**
 * The signed-in Admin or Manager (API Design: expenses are open to both),
 * with their name for "Paid by"; anyone else goes back to the dashboard.
 */
export async function expensesContext(action: keyof typeof expensesPolicy) {
  const session = await readSession();
  const role = session?.result.role;
  const roles: readonly string[] = expensesPolicy[action];
  if (!session || !role || !roles.includes(role)) redirect("/dashboard");
  return {
    ctx: authorize(session.context, expensesPolicy, action),
    myName: session.result.user.name,
  };
}

/** The expense, or the 404 page when it isn't in this wedding. */
export async function expenseOr404(
  ctx: Awaited<ReturnType<typeof expensesContext>>["ctx"],
  id: string,
) {
  try {
    return await getExpense(ctx, id);
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    throw err;
  }
}
