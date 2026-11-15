// Permission rules mapping wedding actions to roles, matching the PRD's
// "Roles and permissions" table: only Admins manage members ("Managers cannot
// invite, remove or change roles").
import type { Policy } from "@/platform/rbac";

export const weddingPolicy = {
  // API Design `GET /wedding`; PRD: Managers view wedding details, only
  // Admins edit them.
  "wedding.view": ["ADMIN", "MANAGER", "PHOTOGRAPHER"],
  "wedding.update": ["ADMIN"],
  "members.list": ["ADMIN"],
  "members.invite": ["ADMIN"],
  "members.update": ["ADMIN"],
  "members.remove": ["ADMIN"],
} as const satisfies Policy;
