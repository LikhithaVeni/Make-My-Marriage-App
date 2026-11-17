// Permission rules for the dashboard (API Design `GET /dashboard`: Admins and
// Managers; the photographer has their own upload area).
import type { Policy } from "@/platform/rbac";

export const dashboardPolicy = {
  "dashboard.view": ["ADMIN", "MANAGER"],
} as const satisfies Policy;
