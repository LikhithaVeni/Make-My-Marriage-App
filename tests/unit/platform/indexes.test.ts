import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createAuthIndexes } from "@/modules/auth";
import { createEventIndexes } from "@/modules/events";
import { createTaskIndexes } from "@/modules/tasks";
import { createWeddingIndexes } from "@/modules/wedding";
import { connectDb } from "@/platform/db";
import { createRateLimitIndexes } from "@/platform/rate-limit";

import { startTestDb, TEST_DB_URI } from "../helpers/test-db";

// The setup script's index builders (decision 68) against Database Design's
// "Indexes" table, for the collections built so far.

let db: Awaited<ReturnType<typeof startTestDb>> | undefined;

beforeAll(async () => {
  if (!TEST_DB_URI) return;
  db = await startTestDb("indexes");
}, 120_000);

afterAll(async () => {
  await db?.stop();
});

/** Each index as "field:1,field:1" plus "unique" / "ttl". */
async function indexesOf(collection: string) {
  const mongoose = await connectDb();
  const indexes = await mongoose.connection
    .db!.collection(collection)
    .indexes();
  return indexes
    .filter((index) => index.name !== "_id_")
    .map((index) =>
      [
        Object.entries(index.key)
          .map(([field, order]) => `${field}:${order}`)
          .join(","),
        index.unique ? "unique" : "",
        index.expireAfterSeconds === 0 ? "ttl" : "",
      ]
        .filter(Boolean)
        .join(" "),
    )
    .sort();
}

describe.skipIf(!TEST_DB_URI)("index setup", () => {
  it("builds Database Design's indexes, and can run again", async () => {
    const mongoose = await connectDb();
    for (let run = 0; run < 2; run++) {
      await createAuthIndexes(mongoose);
      await createWeddingIndexes(mongoose);
      await createEventIndexes(mongoose);
      await createTaskIndexes(mongoose);
      await createRateLimitIndexes(mongoose);
    }

    expect(await indexesOf("users")).toEqual(["email:1 unique"]);
    expect(await indexesOf("sessions")).toEqual(
      ["expiresAt:1 ttl", "idHash:1 unique", "userId:1"].sort(),
    );
    expect(await indexesOf("authTokens")).toEqual(
      ["expiresAt:1 ttl", "tokenHash:1 unique"].sort(),
    );
    expect(await indexesOf("memberships")).toEqual(
      ["userId:1 unique", "weddingId:1,role:1"].sort(),
    );
    expect(await indexesOf("invites")).toEqual(
      ["tokenHash:1 unique", "weddingId:1,status:1"].sort(),
    );
    expect(await indexesOf("weddings")).toEqual(["slug:1 unique"]);
    expect(await indexesOf("tasks")).toEqual(
      [
        "weddingId:1,assigneeId:1,status:1",
        "weddingId:1,dueDate:1",
        "weddingId:1,eventId:1,status:1",
      ].sort(),
    );
    expect(await indexesOf("events")).toEqual(
      ["uploadToken:1 unique", "weddingId:1,startAt:1"].sort(),
    );
    expect(await indexesOf("rateLimits")).toEqual(
      ["key:1 unique", "windowEndsAt:1 ttl"].sort(),
    );
  });
});
