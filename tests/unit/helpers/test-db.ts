import { connectDb } from "@/platform/db";

/**
 * Tests that need a real MongoDB run only when MONGODB_TEST_URI is set, e.g.
 * a separate `mmm_test` database on the development cluster. It must never
 * point at a database with real data: each run drops it first.
 */
export const TEST_DB_URI = process.env.MONGODB_TEST_URI;

/**
 * Points MONGODB_URI at this test file's own database (`mmm_test_<name>`) and
 * empties it, so files running side by side don't wipe each other's data.
 */
export async function startTestDb(name: string) {
  if (!TEST_DB_URI) throw new Error("MONGODB_TEST_URI is not set.");
  const uri = new URL(TEST_DB_URI);
  uri.pathname = `${uri.pathname.replace(/\/$/, "") || "/mmm_test"}_${name}`;
  // Read on first use, so this must run before anything connects.
  process.env.MONGODB_URI = uri.toString();
  // A first connection to a remote cluster sometimes misses the app's
  // 5-second limit; connectDb forgets a failed attempt, so retry.
  let mongoose: Awaited<ReturnType<typeof connectDb>> | undefined;
  for (let attempt = 1; !mongoose; attempt++) {
    try {
      mongoose = await connectDb();
      await mongoose.connection.dropDatabase();
    } catch (err) {
      mongoose = undefined;
      if (attempt >= 3) throw err;
    }
  }

  return {
    async stop() {
      await mongoose.disconnect();
    },
  };
}
