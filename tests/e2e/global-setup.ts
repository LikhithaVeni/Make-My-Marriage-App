import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import { E2E_DB_URI, E2E_USER } from "./support/e2e-db";

/**
 * Empties the e2e database and seeds one verified organiser with a wedding,
 * so tests can log in. Written straight to the collections from Database
 * Design; does nothing without a test database.
 */
export default async function globalSetup() {
  if (!E2E_DB_URI) return;
  await mongoose.connect(E2E_DB_URI, { serverSelectionTimeoutMS: 20_000 });
  const db = mongoose.connection.db!;
  await db.dropDatabase();

  const now = new Date();
  const { insertedId: userId } = await db.collection("users").insertOne({
    name: E2E_USER.name,
    email: E2E_USER.email,
    passwordHash: await bcrypt.hash(E2E_USER.password, 10),
    emailVerifiedAt: now,
    failedLogins: 0,
    createdAt: now,
    updatedAt: now,
  });
  const { insertedId: weddingId } = await db.collection("weddings").insertOne({
    brideName: "Test",
    groomName: "E2E",
    title: "E2E weds Test",
    date: "2028-01-28",
    city: "Hyderabad",
    slug: "e2e-weds-test",
    tagline: "invite you to celebrate with us",
    website: { published: false, showEventsPublicly: false },
    proPasswordVersion: 0,
    guestUploadCap: 100,
    storageBytes: 0,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  });
  await db.collection("memberships").insertOne({
    userId,
    weddingId,
    role: "ADMIN",
    createdAt: now,
    updatedAt: now,
  });
  await mongoose.disconnect();
}
