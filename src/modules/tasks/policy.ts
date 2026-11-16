// Permission rules mapping tasks actions to roles, from API Design's "Tasks"
// table and the PRD's "Roles and permissions": Admins and Managers create,
// edit and delete tasks; the photographer has none.
import type { Policy } from "@/platform/rbac";

export const tasksPolicy = {
  "tasks.list": ["ADMIN", "MANAGER"],
  "tasks.view": ["ADMIN", "MANAGER"],
  "tasks.create": ["ADMIN", "MANAGER"],
  "tasks.update": ["ADMIN", "MANAGER"],
  "tasks.delete": ["ADMIN", "MANAGER"],
} as const satisfies Policy;
