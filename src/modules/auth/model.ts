// Mongoose schemas and indexes for users, sessions and authTokens
// (docs/Database Design v1.md). Private to the auth module: other code must
// not import this file.
import type { Model, Mongoose, Types } from "mongoose";

import type { Role } from "@/platform/rbac";

export interface UserDoc {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  emailVerifiedAt?: Date | null;
  failedLogins: number;
  lockedUntil?: Date | null;
  lastLoginAt?: Date | null;
}

export interface SessionDoc {
  _id: Types.ObjectId;
  /** SHA-256 of the cookie value; the value itself is never stored. */
  idHash: string;
  userId: Types.ObjectId;
  weddingId?: Types.ObjectId | null;
  role?: Role | null;
  expiresAt: Date;
  userAgent?: string;
  ip?: string;
}

export interface AuthTokenDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: "VERIFY_EMAIL" | "RESET_PASSWORD";
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date | null;
}

export interface AuthModels {
  User: Model<UserDoc>;
  Session: Model<SessionDoc>;
  AuthToken: Model<AuthTokenDoc>;
}

/**
 * Registers the models on first use. Mongoose itself is loaded lazily by
 * connectDb (decision 25), so the schemas are built from that instance.
 */
export function authModels(mongoose: Mongoose): AuthModels {
  const { Schema } = mongoose;
  const { ObjectId } = Schema.Types;

  const User =
    (mongoose.models.User as Model<UserDoc> | undefined) ??
    mongoose.model<UserDoc>(
      "User",
      new Schema<UserDoc>(
        {
          name: { type: String, required: true, trim: true, maxlength: 80 },
          email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            unique: true,
          },
          passwordHash: { type: String, required: true },
          emailVerifiedAt: Date,
          failedLogins: { type: Number, required: true, default: 0 },
          lockedUntil: Date,
          lastLoginAt: Date,
        },
        { timestamps: true },
      ),
      "users",
    );

  const Session =
    (mongoose.models.Session as Model<SessionDoc> | undefined) ??
    mongoose.model<SessionDoc>(
      "Session",
      new Schema<SessionDoc>(
        {
          idHash: { type: String, required: true, unique: true },
          userId: { type: ObjectId, required: true, ref: "User", index: true },
          weddingId: { type: ObjectId, ref: "Wedding" },
          role: { type: String, enum: ["ADMIN", "MANAGER", "PHOTOGRAPHER"] },
          // TTL 0 s: MongoDB removes the session once it expires.
          expiresAt: { type: Date, required: true, expires: 0 },
          userAgent: String,
          ip: String,
        },
        { timestamps: true },
      ),
      "sessions",
    );

  const AuthToken =
    (mongoose.models.AuthToken as Model<AuthTokenDoc> | undefined) ??
    mongoose.model<AuthTokenDoc>(
      "AuthToken",
      new Schema<AuthTokenDoc>(
        {
          userId: { type: ObjectId, required: true, ref: "User" },
          type: {
            type: String,
            required: true,
            enum: ["VERIFY_EMAIL", "RESET_PASSWORD"],
          },
          tokenHash: { type: String, required: true, unique: true },
          expiresAt: { type: Date, required: true, expires: 0 },
          usedAt: Date,
        },
        { timestamps: true },
      ),
      "authTokens",
    );

  return { User, Session, AuthToken };
}
