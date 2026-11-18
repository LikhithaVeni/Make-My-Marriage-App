// Public entry point of the activity module: exports its service and types.
export {
  activityPeople,
  changesOf,
  listActivity,
  quoted,
  recentActivity,
  recordActivity,
  type ActivityChange,
  type ActivityPage,
  type ActivityView,
  type Actor,
} from "./service";
export {
  ACTIONS,
  createActivityIndexes,
  ENTITY_TYPES,
  type Action,
  type EntityType,
} from "./model";
export { activityPolicy } from "./policy";
export { listActivityQuerySchema, parseActivityQuery } from "./schemas";
export type { ActivityQuery } from "./schemas";
