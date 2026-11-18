// Permission rules for the activity log (API Design `GET /activity`: Admins
// and Managers; PRD: visible to all organisers).
import type { Policy } from "@/platform/rbac";

export const activityPolicy = {
  "activity.list": ["ADMIN", "MANAGER"],
} as const satisfies Policy;
