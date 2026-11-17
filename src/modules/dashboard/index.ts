// Public entry point of the dashboard module: exports its service and types.
export { getDashboard } from "./service";
export { dashboardPolicy } from "./policy";
export { dashboardSchema, MY_TASKS_LIMIT } from "./schemas";
export type { Dashboard, TaskPriority } from "./schemas";
