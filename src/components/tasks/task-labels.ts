import type { BadgeTone } from "@/components/ui/Badge";

// How a task's priority and status read and look, shared by the tasks pages
// and the dashboard (docs/design-system.md, "Badge").

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "COMPLETED";

export const PRIORITY_LABELS: Record<
  TaskPriority,
  { label: string; tone: BadgeTone }
> = {
  HIGH: { label: "High", tone: "accent" },
  MEDIUM: { label: "Medium", tone: "warning" },
  LOW: { label: "Low", tone: "neutral" },
};

export const STATUS_LABELS: Record<
  TaskStatus,
  { label: string; tone: BadgeTone }
> = {
  TODO: { label: "To Do", tone: "neutral" },
  IN_PROGRESS: { label: "In Progress", tone: "warning" },
  COMPLETED: { label: "Completed", tone: "success" },
};

/** PRD order: To Do → In Progress → Completed. */
export const STATUS_ORDER: TaskStatus[] = ["TODO", "IN_PROGRESS", "COMPLETED"];
export const PRIORITY_ORDER: TaskPriority[] = ["HIGH", "MEDIUM", "LOW"];
