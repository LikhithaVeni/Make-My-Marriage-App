// Mongoose schema and indexes for tasks (docs/Database Design v1.md,
// "tasks"). Private to the tasks module: other code must not import this
// file.
import type { Model, Mongoose, Types } from "mongoose";

export const PRIORITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export const STATUSES = ["TODO", "IN_PROGRESS", "COMPLETED"] as const;
export type Priority = (typeof PRIORITIES)[number];
export type Status = (typeof STATUSES)[number];

export interface TaskDoc {
  _id: Types.ObjectId;
  weddingId: Types.ObjectId;
  /** 1–200 characters. */
  title: string;
  description?: string;
  /** Empty: a general wedding task. */
  eventId?: Types.ObjectId;
  /** An Admin or Manager of this wedding; empty: unassigned. */
  assigneeId?: Types.ObjectId;
  /** YYYY-MM-DD, a calendar date in Asia/Kolkata. */
  dueDate?: string;
  priority: Priority;
  status: Status;
  completedAt?: Date;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export function taskModels(mongoose: Mongoose): { Task: Model<TaskDoc> } {
  const existing = mongoose.models.Task as Model<TaskDoc> | undefined;
  if (existing) return { Task: existing };

  const { Schema } = mongoose;
  const { ObjectId } = Schema.Types;
  const schema = new Schema<TaskDoc>(
    {
      weddingId: { type: ObjectId, required: true, ref: "Wedding" },
      title: { type: String, required: true, trim: true, maxlength: 200 },
      description: { type: String, maxlength: 2000 },
      eventId: { type: ObjectId, ref: "Event" },
      assigneeId: { type: ObjectId, ref: "User" },
      dueDate: String,
      priority: {
        type: String,
        required: true,
        enum: PRIORITIES,
        default: "MEDIUM",
      },
      status: { type: String, required: true, enum: STATUSES, default: "TODO" },
      completedAt: Date,
      createdBy: { type: ObjectId, required: true, ref: "User" },
      updatedBy: { type: ObjectId, required: true, ref: "User" },
    },
    { timestamps: true },
  );
  // Database Design "Indexes": my tasks and the dashboard; tasks by event;
  // overdue and upcoming (open tasks only).
  schema.index({ weddingId: 1, assigneeId: 1, status: 1 });
  schema.index({ weddingId: 1, eventId: 1, status: 1 });
  schema.index(
    { weddingId: 1, dueDate: 1 },
    { partialFilterExpression: { status: { $in: ["TODO", "IN_PROGRESS"] } } },
  );

  return { Task: mongoose.model<TaskDoc>("Task", schema, "tasks") };
}

/** Builds the indexes declared above, for the setup script (decision 68). */
export async function createTaskIndexes(mongoose: Mongoose): Promise<void> {
  await taskModels(mongoose).Task.createIndexes();
}
