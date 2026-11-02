import "server-only";

import type { Mongoose } from "mongoose";

import { isConfigured, requireService } from "@/platform/env";

export type DbStatus = "up" | "down" | "not_configured";

// How long any query waits to find a usable server. Long enough to ride out a
// brief Atlas primary switch, short enough for a serverless request (the
// driver default is 30 s).
const SERVER_SELECTION_TIMEOUT_MS = 5_000;
// Separate cap on the health check, so GET /api/health answers within 2 seconds
// when MongoDB is unreachable.
const STATUS_TIMEOUT_MS = 1_500;

interface MongooseCache {
  connection: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

// Cached on globalThis so hot reloads in development and warm serverless
// invocations reuse one connection instead of opening new ones.
const globalForDb = globalThis as typeof globalThis & {
  mongooseCache?: MongooseCache;
};
const cache = (globalForDb.mongooseCache ??= {
  connection: null,
  promise: null,
});

/** Connects once and reuses the connection. Throws SERVICE_NOT_CONFIGURED without MONGODB_URI. */
export async function connectDb(): Promise<Mongoose> {
  if (cache.connection) {
    return cache.connection;
  }

  const { MONGODB_URI } = requireService("mongodb");
  // Mongoose is loaded on first use: importing it takes over a second on a cold
  // start, which would otherwise delay every request that loads this file, even
  // with no database configured.
  cache.promise ??= import("mongoose")
    .then(({ default: mongoose }) =>
      mongoose.connect(MONGODB_URI, {
        // Pool of 2 per serverless instance keeps Atlas free-tier connections low.
        maxPoolSize: 2,
        serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
        bufferCommands: false,
        // Indexes are created by a setup script in production (Database Design v1).
        autoIndex: process.env.NODE_ENV !== "production",
      }),
    )
    .catch((err: unknown) => {
      cache.promise = null;
      throw err;
    });

  cache.connection = await cache.promise;
  return cache.connection;
}

async function ping(): Promise<void> {
  const { connection } = await connectDb();
  if (!connection.db) {
    throw new Error("MongoDB connection has no database handle.");
  }
  await connection.db.command({ ping: 1 });
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timed out after ${ms} ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** Never throws: reports whether MongoDB answers a ping within the time limit. */
export async function dbStatus(): Promise<DbStatus> {
  if (!isConfigured("mongodb")) {
    return "not_configured";
  }
  try {
    await withTimeout(ping(), STATUS_TIMEOUT_MS);
    return "up";
  } catch {
    return "down";
  }
}
