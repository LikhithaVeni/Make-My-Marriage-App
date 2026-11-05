// Mongoose schemas and indexes for weddings and memberships (docs/Database
// Design v1.md); invites arrive with member invitations. Private to the
// wedding module: other code must not import this file.
import type { Model, Mongoose, Types } from "mongoose";

import type { Role } from "@/platform/rbac";

export const DEFAULT_TAGLINE = "invite you to celebrate with us";

export interface WeddingDoc {
  _id: Types.ObjectId;
  brideName: string;
  groomName: string;
  title: string;
  /** YYYY-MM-DD, a calendar date in Asia/Kolkata. */
  date: string;
  city: string;
  slug: string;
  coverKey?: string;
  description?: string;
  tagline: string;
  rsvpCutoff?: string;
  website: { published: boolean; showEventsPublicly: boolean };
  proPasswordHash?: string;
  proPasswordVersion: number;
  guestUploadCap: number;
  storageBytes: number;
  createdBy: Types.ObjectId;
}

export interface MembershipDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  weddingId: Types.ObjectId;
  role: Role;
  relationLabel?: string;
  invitedBy?: Types.ObjectId;
}

export interface WeddingModels {
  Wedding: Model<WeddingDoc>;
  Membership: Model<MembershipDoc>;
}

/** Registers the models on first use, from the Mongoose instance connectDb loaded. */
export function weddingModels(mongoose: Mongoose): WeddingModels {
  const { Schema } = mongoose;
  const { ObjectId } = Schema.Types;

  const Wedding =
    (mongoose.models.Wedding as Model<WeddingDoc> | undefined) ??
    mongoose.model<WeddingDoc>(
      "Wedding",
      new Schema<WeddingDoc>(
        {
          brideName: { type: String, required: true, trim: true },
          groomName: { type: String, required: true, trim: true },
          title: { type: String, required: true, trim: true },
          date: { type: String, required: true },
          city: { type: String, required: true, trim: true },
          slug: { type: String, required: true, unique: true },
          coverKey: String,
          description: { type: String, maxlength: 2000 },
          tagline: { type: String, required: true, default: DEFAULT_TAGLINE },
          rsvpCutoff: String,
          website: {
            published: { type: Boolean, required: true, default: false },
            showEventsPublicly: {
              type: Boolean,
              required: true,
              default: false,
            },
          },
          proPasswordHash: String,
          proPasswordVersion: { type: Number, required: true, default: 0 },
          guestUploadCap: { type: Number, required: true, default: 100 },
          storageBytes: { type: Number, required: true, default: 0 },
          createdBy: { type: ObjectId, required: true, ref: "User" },
        },
        { timestamps: true },
      ),
      "weddings",
    );

  const membershipSchema = new Schema<MembershipDoc>(
    {
      // Unique: one wedding per user in v1 (PRD).
      userId: { type: ObjectId, required: true, ref: "User", unique: true },
      weddingId: { type: ObjectId, required: true, ref: "Wedding" },
      role: {
        type: String,
        required: true,
        enum: ["ADMIN", "MANAGER", "PHOTOGRAPHER"],
      },
      relationLabel: String,
      invitedBy: { type: ObjectId, ref: "User" },
    },
    { timestamps: true },
  );
  membershipSchema.index({ weddingId: 1, role: 1 });

  const Membership =
    (mongoose.models.Membership as Model<MembershipDoc> | undefined) ??
    mongoose.model<MembershipDoc>(
      "Membership",
      membershipSchema,
      "memberships",
    );

  return { Wedding, Membership };
}
