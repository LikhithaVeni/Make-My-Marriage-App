// Permission rules mapping events actions to roles, from API Design's
// "Events" table and the PRD's "Roles and permissions": Admins create and
// delete events, Managers edit their details, the photographer reads the
// list (to upload into each event's album).
import type { Policy } from "@/platform/rbac";

export const eventsPolicy = {
  "events.list": ["ADMIN", "MANAGER", "PHOTOGRAPHER"],
  "events.view": ["ADMIN", "MANAGER"],
  "events.create": ["ADMIN"],
  "events.update": ["ADMIN", "MANAGER"],
  /** The livestream link is set by an Admin (PRD "Events"). */
  "events.livestream": ["ADMIN"],
  "events.delete": ["ADMIN"],
} as const satisfies Policy;
