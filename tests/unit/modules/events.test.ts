import { randomBytes } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  checkEventDelete,
  createEvent,
  createEventSchema,
  deleteEvent,
  END_BEFORE_START,
  eventsPolicy,
  getEvent,
  googleMapsSearch,
  isYouTubeUrl,
  listEvents,
  MUHURTHAM_OUTSIDE,
  updateEvent,
  updateEventSchema,
} from "@/modules/events";
import { AppError } from "@/platform/errors";
import { authorize, type Role, type WeddingContext } from "@/platform/rbac";

import { startTestDb, TEST_DB_URI } from "../helpers/test-db";

// PRD "Events", key flow F3; API Design "Events"; decision 70.

const sangeet = {
  name: "Sangeet",
  startAt: "2028-01-26T19:00:00+05:30",
  endAt: "2028-01-26T23:30:00+05:30",
  venue: {
    name: "Grand Palace Hall",
    address: "Road No. 12, Banjara Hills, Hyderabad",
  },
};

const objectId = () => randomBytes(12).toString("hex");
const context = (weddingId: string, role: Role = "ADMIN"): WeddingContext => ({
  userId: objectId(),
  weddingId,
  role,
});

/** The AppError a promise rejects with. */
async function failure(promise: Promise<unknown>): Promise<AppError> {
  try {
    await promise;
  } catch (err) {
    if (err instanceof AppError) return err;
    throw err;
  }
  throw new Error("Expected an AppError");
}

describe("createEventSchema", () => {
  it("accepts the PRD's required fields and trims them", () => {
    const parsed = createEventSchema.parse({
      ...sangeet,
      name: "  Sangeet ",
      venue: { ...sangeet.venue, name: " Grand Palace Hall " },
    });
    expect(parsed.name).toBe("Sangeet");
    expect(parsed.venue.name).toBe("Grand Palace Hall");
  });

  it("names each missing or wrong field", () => {
    const result = createEventSchema.safeParse({
      name: " ",
      startAt: "26/01/2028",
      endAt: "",
      venue: { name: "", address: "" },
    });
    const fields = result.error?.issues.map((issue) => issue.path.join("."));
    expect(fields).toEqual(
      expect.arrayContaining([
        "name",
        "startAt",
        "endAt",
        "venue.name",
        "venue.address",
      ]),
    );
  });

  it("needs the end after the start, which may be the next day", () => {
    const backwards = createEventSchema.safeParse({
      ...sangeet,
      endAt: "2028-01-26T18:00:00+05:30",
    });
    expect(backwards.error?.issues[0]).toMatchObject({
      path: ["endAt"],
      message: END_BEFORE_START,
    });
    // A late-night muhurtham ends after midnight (PRD).
    expect(
      createEventSchema.safeParse({
        ...sangeet,
        endAt: "2028-01-27T03:00:00+05:30",
      }).success,
    ).toBe(true);
  });

  it("keeps the muhurtham within the event", () => {
    const outside = createEventSchema.safeParse({
      ...sangeet,
      muhurthamAt: "2028-01-26T10:00:00+05:30",
    });
    expect(outside.error?.issues[0]).toMatchObject({
      path: ["muhurthamAt"],
      message: MUHURTHAM_OUTSIDE,
    });
    expect(
      createEventSchema.safeParse({
        ...sangeet,
        muhurthamAt: "2028-01-26T21:16:00+05:30",
      }).success,
    ).toBe(true);
  });

  it("takes only web links for the map and YouTube for the livestream", () => {
    const bad = createEventSchema.safeParse({
      ...sangeet,
      venue: { ...sangeet.venue, mapUrl: "javascript:alert(1)" },
      livestreamUrl: "https://vimeo.com/123",
    });
    const fields = bad.error?.issues.map((issue) => issue.path.join("."));
    expect(fields).toEqual(
      expect.arrayContaining(["venue.mapUrl", "livestreamUrl"]),
    );
    expect(isYouTubeUrl("https://www.youtube.com/live/abc")).toBe(true);
    expect(isYouTubeUrl("https://youtu.be/abc")).toBe(true);
    expect(isYouTubeUrl("http://youtube.com/watch?v=abc")).toBe(false);
    expect(isYouTubeUrl("https://notyoutube.com/abc")).toBe(false);
  });
});

describe("updateEventSchema", () => {
  it("accepts any one field, including one venue field", () => {
    expect(updateEventSchema.parse({ dressCode: " Pastels " })).toEqual({
      dressCode: "Pastels",
    });
    expect(
      updateEventSchema.parse({ venue: { address: "Jubilee Hills" } }),
    ).toEqual({ venue: { address: "Jubilee Hills" } });
  });

  it("allows clearing optional fields, not required ones", () => {
    expect(
      updateEventSchema.safeParse({
        dressCode: "",
        instructions: "",
        muhurthamAt: "",
        livestreamUrl: "",
        venue: { mapUrl: "" },
      }).success,
    ).toBe(true);
    expect(updateEventSchema.safeParse({ name: "" }).success).toBe(false);
    expect(updateEventSchema.safeParse({ venue: { name: "" } }).success).toBe(
      false,
    );
  });

  it("refuses an empty change", () => {
    expect(updateEventSchema.safeParse({}).success).toBe(false);
    expect(updateEventSchema.safeParse({ venue: {} }).success).toBe(false);
  });
});

describe("events policy", () => {
  const session = (role: Role) => ({
    userId: objectId(),
    emailVerified: true,
    weddingId: objectId(),
    role,
  });

  it("matches API Design's Events roles", () => {
    const allowed = (role: Role, action: keyof typeof eventsPolicy) => {
      try {
        authorize(session(role), eventsPolicy, action);
        return true;
      } catch {
        return false;
      }
    };
    expect(allowed("PHOTOGRAPHER", "events.list")).toBe(true);
    expect(allowed("PHOTOGRAPHER", "events.view")).toBe(false);
    expect(allowed("MANAGER", "events.update")).toBe(true);
    for (const action of [
      "events.create",
      "events.delete",
      "events.livestream",
    ] as const) {
      expect(allowed("ADMIN", action)).toBe(true);
      expect(allowed("MANAGER", action)).toBe(false);
    }
  });
});

describe("googleMapsSearch", () => {
  it("searches for the venue's name and address", () => {
    expect(googleMapsSearch({ name: "Hall & Co", address: "Road 1" })).toBe(
      "https://www.google.com/maps/search/?api=1&query=Hall%20%26%20Co%2C%20Road%201",
    );
  });
});

let db: Awaited<ReturnType<typeof startTestDb>> | undefined;

beforeAll(async () => {
  if (!TEST_DB_URI) return;
  db = await startTestDb("events");
}, 120_000);

afterAll(async () => {
  await db?.stop();
});

describe.skipIf(!TEST_DB_URI)("events service", () => {
  it("lists a wedding's events by start time, never another wedding's", async () => {
    const weddingId = objectId();
    const admin = context(weddingId);
    const parse = (input: object) => createEventSchema.parse(input);

    await createEvent(
      admin,
      parse({
        ...sangeet,
        name: "Reception",
        startAt: "2028-01-29T19:00:00+05:30",
        endAt: "2028-01-29T23:00:00+05:30",
      }),
    );
    await createEvent(admin, parse({ ...sangeet, name: "Haldi" }));
    // Same start as Haldi: the one added later comes second.
    await createEvent(admin, parse({ ...sangeet, name: "Mehendi" }));
    await createEvent(context(objectId()), parse(sangeet));

    const events = await listEvents(admin);
    expect(events.map((event) => event.name)).toEqual([
      "Haldi",
      "Mehendi",
      "Reception",
    ]);
    expect(events[0]).toMatchObject({
      startAt: "2028-01-26T13:30:00.000Z",
      muhurthamAt: null,
      dressCode: null,
      venue: {
        mapUrl: googleMapsSearch(sangeet.venue),
        mapUrlCustom: false,
      },
    });
    // Only Admins see the upload link (it lets anyone upload).
    expect(events[0]!.uploadUrl).toMatch(/\/u\/[\w-]{32}$/);
    const asManager = await listEvents(context(weddingId, "MANAGER"));
    expect(asManager[0]!.uploadUrl).toBeUndefined();
  });

  it("finds an event only in its own wedding", async () => {
    const admin = context(objectId());
    const event = await createEvent(admin, createEventSchema.parse(sangeet));

    expect((await getEvent(admin, event.id)).name).toBe("Sangeet");
    for (const [ctx, id] of [
      [context(objectId()), event.id],
      [admin, objectId()],
      [admin, "not-an-id"],
    ] as const) {
      expect((await failure(getEvent(ctx, id))).code).toBe("NOT_FOUND");
    }
  });

  it("saves only the fields sent, clears optional ones, checks times", async () => {
    const weddingId = objectId();
    const admin = context(weddingId);
    const manager = context(weddingId, "MANAGER");
    const event = await createEvent(
      admin,
      createEventSchema.parse({
        ...sangeet,
        muhurthamAt: "2028-01-26T21:16:00+05:30",
        dressCode: "Indo-western",
        venue: { ...sangeet.venue, mapUrl: "https://maps.app.goo.gl/abc" },
      }),
    );
    expect(event.venue).toMatchObject({
      mapUrl: "https://maps.app.goo.gl/abc",
      mapUrlCustom: true,
    });

    // A Manager edits details (PRD) …
    const edited = await updateEvent(
      manager,
      event.id,
      updateEventSchema.parse({
        venue: { address: "Jubilee Hills, Hyderabad", mapUrl: "" },
        dressCode: "",
      }),
    );
    expect(edited).toMatchObject({
      name: "Sangeet",
      dressCode: null,
      muhurthamAt: "2028-01-26T15:46:00.000Z",
      venue: {
        name: "Grand Palace Hall",
        address: "Jubilee Hills, Hyderabad",
        mapUrlCustom: false,
      },
    });
    // … but not the livestream link.
    const livestream = updateEventSchema.parse({
      livestreamUrl: "https://youtu.be/abc",
    });
    expect(
      (await failure(updateEvent(manager, event.id, livestream))).code,
    ).toBe("FORBIDDEN");
    expect((await updateEvent(admin, event.id, livestream)).livestreamUrl).toBe(
      "https://youtu.be/abc",
    );

    // Times are checked against the saved ones.
    const early = await failure(
      updateEvent(
        admin,
        event.id,
        updateEventSchema.parse({ endAt: "2028-01-26T18:00:00+05:30" }),
      ),
    );
    // The 9:16 pm muhurtham is now outside the event too; both are named.
    expect(early.details).toEqual({
      fields: { endAt: END_BEFORE_START, muhurthamAt: MUHURTHAM_OUTSIDE },
    });
    const outside = await failure(
      updateEvent(
        admin,
        event.id,
        updateEventSchema.parse({ startAt: "2028-01-26T22:00:00+05:30" }),
      ),
    );
    expect(outside.details).toEqual({
      fields: { muhurthamAt: MUHURTHAM_OUTSIDE },
    });
    // Clearing the muhurtham lets the start move.
    const moved = await updateEvent(
      admin,
      event.id,
      updateEventSchema.parse({
        startAt: "2028-01-26T22:00:00+05:30",
        muhurthamAt: "",
      }),
    );
    expect(moved).toMatchObject({
      startAt: "2028-01-26T16:30:00.000Z",
      muhurthamAt: null,
    });

    // Another wedding can't touch it.
    expect(
      (
        await failure(
          updateEvent(
            context(objectId()),
            event.id,
            updateEventSchema.parse({ name: "Mine now" }),
          ),
        )
      ).code,
    ).toBe("NOT_FOUND");
  });

  it("deletes an event after a check that nothing blocks it", async () => {
    const admin = context(objectId());
    const event = await createEvent(admin, createEventSchema.parse(sangeet));

    expect(await checkEventDelete(admin, event.id)).toEqual({
      blocked: false,
      blockingTasks: [],
      blockingExpenses: [],
      willUnlink: { tasks: 0, paidExpenses: 0, photos: 0, guests: 0 },
    });
    expect(
      (await failure(deleteEvent(context(objectId()), event.id))).code,
    ).toBe("NOT_FOUND");
    await deleteEvent(admin, event.id);
    expect(await listEvents(admin)).toEqual([]);
    expect((await failure(deleteEvent(admin, event.id))).code).toBe(
      "NOT_FOUND",
    );
  });
});
