// Permission rules for expenses (API Design: "All expense and vendor
// endpoints are open to Admins and Managers, including delete"; PRD: all
// organisers see all expenses).
import type { Policy } from "@/platform/rbac";

export const expensesPolicy = {
  "expenses.list": ["ADMIN", "MANAGER"],
  "expenses.view": ["ADMIN", "MANAGER"],
  "expenses.create": ["ADMIN", "MANAGER"],
  "expenses.update": ["ADMIN", "MANAGER"],
  "expenses.delete": ["ADMIN", "MANAGER"],
} as const satisfies Policy;
