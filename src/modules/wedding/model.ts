// Mongoose schemas and indexes for weddings, memberships and invites
// (docs/Database Design v1.md). Private to the wedding module: other code
// must not import this file.
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

export type InviteStatus = "PENDING" | "ACCEPTED" | "CANCELLED" | "EXPIRED";

export interface InviteDoc {
  _id: Types.ObjectId;
  weddingId: Types.ObjectId;
  /** Lowercase. */
  email: string;
  name: string;
  role: "ADMIN" | "MANAGER";
  relationLabel?: string;
  /** SHA-256 of the link's token; the token itself is never stored. */
  tokenHash: string;
  status: InviteStatus;
  expiresAt: Date;
  invitedBy: Types.ObjectId;
  acceptedBy?: Types.ObjectId;
  createdAt?: Date;
}

export interface WeddingModels {
  Wedding: Model<WeddingDoc>;
  Membership: Model<MembershipDoc>;
  Invite: Model<InviteDoc>;
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

  const inviteSchema = new Schema<InviteDoc>(
    {
      weddingId: { type: ObjectId, required: true, ref: "Wedding" },
      email: { type: String, required: true, lowercase: true, trim: true },
      name: { type: String, required: true, trim: true },
      role: { type: String, required: true, enum: ["ADMIN", "MANAGER"] },
      relationLabel: String,
      tokenHash: { type: String, required: true, unique: true },
      status: {
        type: String,
        required: true,
        enum: ["PENDING", "ACCEPTED", "CANCELLED", "EXPIRED"],
        default: "PENDING",
      },
      expiresAt: { type: Date, required: true },
      invitedBy: { type: ObjectId, required: true, ref: "User" },
      acceptedBy: { type: ObjectId, ref: "User" },
    },
    { timestamps: true },
  );
  inviteSchema.index({ weddingId: 1, status: 1 });

  const Invite =
    (mongoose.models.Invite as Model<InviteDoc> | undefined) ??
    mongoose.model<InviteDoc>("Invite", inviteSchema, "invites");

  return { Wedding, Membership, Invite };
}
