// Mongoose schema and indexes for activityLog (docs/Database Design v1.md,
// "activityLog"; append-only). Private to the activity module: other code
// must not import this file.
import type { Model, Mongoose, Types } from "mongoose";

export const ACTIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "INVITE",
  "ROLE_CHANGE",
  "SEND",
  "UPLOAD",
  "RSVP",
] as const;
export const ENTITY_TYPES = [
  "EVENT",
  "TASK",
  "EXPENSE",
  "VENDOR",
  "GUEST",
  "PHOTO",
  "MEMBER",
  "WEDDING",
] as const;
export type Action = (typeof ACTIONS)[number];
export type EntityType = (typeof ENTITY_TYPES)[number];

export interface ActivityDoc {
  _id: Types.ObjectId;
  weddingId: Types.ObjectId;
  actor: {
    kind: "USER" | "GUEST" | "SYSTEM";
    id?: Types.ObjectId;
    /** Copied when the change happens, so it reads the same later. */
    name: string;
  };
  action: Action;
  entity: { type: EntityType; id: Types.ObjectId; label: string };
  /** A full sentence: "Priya moved 'Book caterer' to Completed". */
  summary: string;
  /** For UPDATE: what changed; long or sensitive values are left out. */
  changes?: { field: string; from?: unknown; to?: unknown }[];
  createdAt: Date;
}

export function activityModels(mongoose: Mongoose): {
  Activity: Model<ActivityDoc>;
} {
  const existing = mongoose.models.Activity as Model<ActivityDoc> | undefined;
  if (existing) return { Activity: existing };

  const { Schema } = mongoose;
  const { ObjectId, Mixed } = Schema.Types;
  const schema = new Schema<ActivityDoc>(
    {
      weddingId: { type: ObjectId, required: true, ref: "Wedding" },
      actor: {
        kind: {
          type: String,
          required: true,
          enum: ["USER", "GUEST", "SYSTEM"],
        },
        id: ObjectId,
        name: { type: String, required: true },
      },
      action: { type: String, required: true, enum: ACTIONS },
      entity: {
        type: { type: String, required: true, enum: ENTITY_TYPES },
        id: { type: ObjectId, required: true },
        label: { type: String, required: true },
      },
      summary: { type: String, required: true, maxlength: 400 },
      changes: {
        type: [{ _id: false, field: String, from: Mixed, to: Mixed }],
        default: undefined,
      },
    },
    // Append-only: there is no updatedAt.
    { timestamps: { createdAt: true, updatedAt: false } },
  );
  // Database Design "Indexes": the feed, by area, by person; newest first.
  schema.index({ weddingId: 1, _id: -1 });
  schema.index({ weddingId: 1, "entity.type": 1, _id: -1 });
  schema.index({ weddingId: 1, "actor.id": 1, _id: -1 });

  return {
    Activity: mongoose.model<ActivityDoc>("Activity", schema, "activityLog"),
  };
}

/** Builds the indexes declared above, for the setup script (decision 68). */
export async function createActivityIndexes(mongoose: Mongoose): Promise<void> {
  await activityModels(mongoose).Activity.createIndexes();
}
