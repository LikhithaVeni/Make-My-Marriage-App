import { createHash, randomBytes } from "node:crypto";

import mongoose from "mongoose";

import { E2E_DB_URI, E2E_USER } from "./e2e-db";

// End-to-end tests can't read invite emails (they print in the server's
// terminal), so these helpers write invites straight into the e2e database
// with a known token, in the shape Database Design gives `invites`.

async function db() {
  if (!E2E_DB_URI) throw new Error("MONGODB_TEST_URI is not set.");
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(E2E_DB_URI, { serverSelectionTimeoutMS: 20_000 });
  }
  return mongoose.connection.db!;
}

const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");

interface SeedInvite {
  email: string;
  name?: string;
  role?: "ADMIN" | "MANAGER";
  /** Defaults to the seeded wedding ("E2E weds Test"). */
  weddingId?: mongoose.Types.ObjectId;
  /** Defaults to 7 days from now; pass a past date for an expired invite. */
  expiresAt?: Date;
}

/** Creates a pending invite and returns its link token. */
export async function seedInvite(invite: SeedInvite): Promise<string> {
  const database = await db();
  const admin = await database
    .collection("users")
    .findOne({ email: E2E_USER.email });
  const wedding = await database
    .collection("weddings")
    .findOne({ slug: "e2e-weds-test" });
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  await database.collection("invites").insertOne({
    weddingId: invite.weddingId ?? wedding!._id,
    email: invite.email,
    name: invite.name ?? "E2E Family",
    role: invite.role ?? "MANAGER",
    tokenHash: sha256(token),
    status: "PENDING",
    expiresAt:
      invite.expiresAt ?? new Date(now.getTime() + 7 * 24 * 60 * 60_000),
    invitedBy: admin!._id,
    createdAt: now,
    updatedAt: now,
  });
  return token;
}

/** A second wedding with no members, for the "another wedding" cases. */
export async function seedOtherWedding(): Promise<mongoose.Types.ObjectId> {
  const database = await db();
  const admin = await database
    .collection("users")
    .findOne({ email: E2E_USER.email });
  const now = new Date();
  const { insertedId } = await database.collection("weddings").insertOne({
    brideName: "Other",
    groomName: "Wedding",
    title: "Another wedding",
    date: "2028-03-01",
    city: "Chennai",
    slug: `another-wedding-${randomBytes(4).toString("hex")}`,
    tagline: "invite you to celebrate with us",
    website: { published: false, showEventsPublicly: false },
    proPasswordVersion: 0,
    guestUploadCap: 100,
    storageBytes: 0,
    createdBy: admin!._id,
    createdAt: now,
    updatedAt: now,
  });
  return insertedId;
}

export async function closeDb() {
  if (mongoose.connection.readyState === 1) await mongoose.disconnect();
}
