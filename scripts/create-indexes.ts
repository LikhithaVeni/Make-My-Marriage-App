// Builds every collection's indexes. Database Design v1: "Indexes are
// declared in each module's model.ts and created by a setup script, with
// autoIndex off in production" (decision 68). Run it once per database, and
// again whenever a feature adds an index. Existing indexes are left as they
// are, so running it twice is safe.
//
//   pnpm db:indexes --database mmm_prod
//
// The connection string is MONGODB_URI from the environment, or else from
// .env.local; --database replaces its database name, so the target is always
// named on the command line.
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";

import { createAuthIndexes } from "@/modules/auth";
import { createEventIndexes } from "@/modules/events";
import { createWeddingIndexes } from "@/modules/wedding";
import { connectDb } from "@/platform/db";
import { createRateLimitIndexes } from "@/platform/rate-limit";

function targetUri(): { uri: string; database: string; host: string } {
  const flag = process.argv.indexOf("--database");
  const database = flag === -1 ? undefined : process.argv[flag + 1];
  if (!database || !/^[\w-]+$/.test(database)) {
    throw new Error("Name the database: pnpm db:indexes --database mmm_prod");
  }
  const base =
    process.env.MONGODB_URI ??
    (existsSync(".env.local")
      ? parseEnv(readFileSync(".env.local", "utf8")).MONGODB_URI
      : undefined);
  if (!base) throw new Error("MONGODB_URI is not set.");
  const url = new URL(base);
  url.pathname = `/${database}`;
  return { uri: url.toString(), database, host: url.hostname };
}

async function main() {
  const { uri, database, host } = targetUri();
  // Read by connectDb on first use, so this must come before connecting.
  process.env.MONGODB_URI = uri;
  console.log(`Building indexes in "${database}" on ${host}…`);

  const mongoose = await connectDb();
  try {
    await createAuthIndexes(mongoose);
    await createWeddingIndexes(mongoose);
    await createEventIndexes(mongoose);
    await createRateLimitIndexes(mongoose);

    const db = mongoose.connection.db!;
    const collections = (await db.listCollections().toArray())
      .map((collection) => collection.name)
      .sort();
    for (const name of collections) {
      const indexes = await db.collection(name).indexes();
      const described = indexes.map((index) => {
        const options = [
          index.unique && "unique",
          index.expireAfterSeconds !== undefined && "TTL",
        ].filter(Boolean);
        const keys = Object.keys(index.key).join(", ");
        return options.length ? `${keys} (${options.join(", ")})` : keys;
      });
      console.log(`  ${name}: ${described.join("; ")}`);
    }
    console.log("Done.");
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
