// Permission rules for vendors (API Design: "All expense and vendor
// endpoints are open to Admins and Managers, including delete").
import type { Policy } from "@/platform/rbac";

export const vendorsPolicy = {
  "vendors.list": ["ADMIN", "MANAGER"],
  "vendors.view": ["ADMIN", "MANAGER"],
  "vendors.create": ["ADMIN", "MANAGER"],
  "vendors.update": ["ADMIN", "MANAGER"],
  "vendors.delete": ["ADMIN", "MANAGER"],
} as const satisfies Policy;
