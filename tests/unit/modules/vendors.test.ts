import { randomBytes } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { findNearbyUrl, googleMapsSearch } from "@/lib/maps";
import { parsePhone } from "@/lib/phone";
import { createEvent, createEventSchema } from "@/modules/events";
import {
  createExpense,
  createExpenseSchema,
  getExpense,
  listExpenses,
  listExpensesQuerySchema,
  paidByVendor,
  unlinkVendorExpenses,
} from "@/modules/expenses";
import {
  createVendor,
  createVendorSchema,
  deleteVendor,
  getVendor,
  listVendors,
  PHONE_MESSAGE,
  updateVendor,
  updateVendorSchema,
  vendorsPolicy,
  weddingDayContacts,
} from "@/modules/vendors";
import { AppError } from "@/platform/errors";
import { authorize, type Role, type WeddingContext } from "@/platform/rbac";

import { startTestDb, TEST_DB_URI } from "../helpers/test-db";

// PRD "Vendors", key flow F4; API Design "Vendors"; decision 75.

describe("phones as typed in India", () => {
  it("stores them in E.164", () => {
    for (const typed of [
      "98765 43210",
      "098765-43210",
      "+91 98765 43210",
      "919876543210",
      "(98765) 43210",
    ]) {
      expect(parsePhone(typed)).toBe("+919876543210");
    }
    expect(parsePhone("+91 40 2345 6789")).toBe("+914023456789");
    expect(parsePhone("+44 20 7946 0958")).toBe("+442079460958");
    for (const bad of ["12345", "5876543210", "+91 98765", "abc", ""]) {
      expect(parsePhone(bad)).toBeNull();
    }
  });
});

describe("Google Maps links (no API)", () => {
  it("searches for a service near a venue", () => {
    const venue = { name: "Grand Hall", address: "Road 12, Hyderabad" };
    expect(findNearbyUrl("Caterers", venue)).toBe(
      "https://www.google.com/maps/search/?api=1&query=Caterers%20near%20Grand%20Hall%2C%20Road%2012%2C%20Hyderabad",
    );
    expect(googleMapsSearch(venue)).toBe(
      "https://www.google.com/maps/search/?api=1&query=Grand%20Hall%2C%20Road%2012%2C%20Hyderabad",
    );
  });
});

describe("vendor schemas", () => {
  it("needs a name and service; normalises the phone; defaults", () => {
    expect(
      createVendorSchema.parse({
        name: " Bloom Decor ",
        serviceType: "Decor",
        phone: "98765 43210",
      }),
    ).toEqual({
      name: "Bloom Decor",
      serviceType: "Decor",
      phone: "+919876543210",
      bookingStatus: "ENQUIRED",
      weddingDayContact: false,
    });
    const bad = createVendorSchema.safeParse({ phone: "123" });
    expect(bad.error?.issues.map((issue) => issue.path[0])).toEqual(
      expect.arrayContaining(["name", "serviceType", "phone"]),
    );
    expect(
      bad.error?.issues.find((issue) => issue.path[0] === "phone")?.message,
    ).toBe(PHONE_MESSAGE);
  });

  it("takes amounts in whole paise and clears them with null", () => {
    expect(
      createVendorSchema.safeParse({
        name: "A",
        serviceType: "B",
        quotePaise: 1.5,
      }).success,
    ).toBe(false);
    expect(updateVendorSchema.parse({ agreedPaise: null, phone: "" })).toEqual({
      agreedPaise: null,
      phone: "",
    });
    expect(updateVendorSchema.safeParse({}).success).toBe(false);
  });

  it("is open to Admins and Managers, including delete", () => {
    const allowed = (role: Role) => {
      try {
        authorize(
          { userId: "u", emailVerified: true, weddingId: "w", role },
          vendorsPolicy,
          "vendors.delete",
        );
        return true;
      } catch {
        return false;
      }
    };
    expect([
      allowed("ADMIN"),
      allowed("MANAGER"),
      allowed("PHOTOGRAPHER"),
    ]).toEqual([true, true, false]);
  });
});

let db: Awaited<ReturnType<typeof startTestDb>> | undefined;

beforeAll(async () => {
  if (!TEST_DB_URI) return;
  db = await startTestDb("vendors");
}, 120_000);

afterAll(async () => {
  await db?.stop();
});

const objectId = () => randomBytes(12).toString("hex");
const context = (): WeddingContext => ({
  userId: objectId(),
  weddingId: objectId(),
  role: "ADMIN",
});

async function failure(promise: Promise<unknown>): Promise<AppError> {
  try {
    await promise;
  } catch (err) {
    if (err instanceof AppError) return err;
    throw err;
  }
  throw new Error("Expected an AppError");
}

const vendor = (ctx: WeddingContext, input: Record<string, unknown>) =>
  createVendor(ctx, createVendorSchema.parse(input));

describe.skipIf(!TEST_DB_URI)("vendors service", () => {
  it("lists by service then name, with filters, only this wedding's", async () => {
    const ctx = context();
    await vendor(ctx, {
      name: "Spice Route",
      serviceType: "Catering",
      bookingStatus: "QUOTED",
    });
    await vendor(ctx, {
      name: "Bloom Decor",
      serviceType: "Decor",
      phone: "98765 43210",
    });
    await vendor(ctx, {
      name: "Annapurna",
      serviceType: "Catering",
      bookingStatus: "BOOKED",
    });
    await vendor(context(), { name: "Elsewhere", serviceType: "Catering" });

    const names = async (query: Record<string, string> = {}) =>
      (await listVendors(ctx, query, new Map())).map((v) => v.name);
    expect(await names()).toEqual(["Annapurna", "Spice Route", "Bloom Decor"]);
    expect(await names({ serviceType: "catering" })).toEqual([
      "Annapurna",
      "Spice Route",
    ]);
    expect(await names({ bookingStatus: "BOOKED" })).toEqual(["Annapurna"]);
    expect(await names({ q: "bloom" })).toEqual(["Bloom Decor"]);
    expect(await names({ q: "43210" })).toEqual(["Bloom Decor"]);
    expect(await names({ q: ".*" })).toEqual([]);
  });

  it("shows paid against agreed from its Paid expenses (PRD key flow F4)", async () => {
    const ctx = context();
    const { id: eventId } = await createEvent(
      ctx,
      createEventSchema.parse({
        name: "Sangeet",
        startAt: "2028-01-26T19:00:00+05:30",
        endAt: "2028-01-26T23:00:00+05:30",
        venue: { name: "Hall", address: "Road" },
      }),
    );
    const decor = await vendor(ctx, {
      name: "Bloom Decor",
      serviceType: "Decor",
      quotePaise: 2_00_000_00,
      agreedPaise: 1_80_000_00,
      bookingStatus: "BOOKED",
    });
    const expense = (input: Record<string, unknown>) =>
      createExpense(
        ctx,
        createExpenseSchema.parse({
          date: "2027-10-01",
          eventId,
          vendorId: decor.id,
          category: "DECOR",
          paidBy: "Venu",
          ...input,
        }),
      );
    const advance = await expense({ amountPaise: 50_000_00, status: "PAID" });
    await expense({
      amountPaise: 1_30_000_00,
      status: "PENDING",
      dueDate: "2028-01-20",
    });
    expect(advance.vendor).toEqual({ id: decor.id, name: "Bloom Decor" });

    const paid = await paidByVendor(ctx);
    const view = await getVendor(ctx, decor.id, paid);
    expect(view).toMatchObject({
      paidPaise: 50_000_00,
      agreedPaise: 1_80_000_00,
      quotePaise: 2_00_000_00,
    });
    expect(
      (
        await listExpenses(
          ctx,
          listExpensesQuerySchema.parse({ vendorId: decor.id }),
        )
      ).expenses,
    ).toHaveLength(2);

    // Another wedding's vendor can't be linked.
    const other = await vendor(context(), {
      name: "Theirs",
      serviceType: "DJ",
    });
    const err = await failure(
      expense({ amountPaise: 100, status: "PAID", vendorId: other.id }),
    );
    expect(err.details).toEqual({
      fields: { vendorId: "Choose one of this wedding's vendors" },
    });

    // Deleting the vendor keeps its expenses, without the link.
    await deleteVendor(ctx, decor.id, unlinkVendorExpenses);
    expect((await getExpense(ctx, advance.id)).vendor).toBeNull();
    expect((await failure(getVendor(ctx, decor.id, paid))).code).toBe(
      "NOT_FOUND",
    );
  });

  it("edits, clears and moves booking status; contacts need a phone", async () => {
    const ctx = context();
    const dj = await vendor(ctx, {
      name: "DJ Ravi",
      serviceType: "DJ",
      quotePaise: 40_000_00,
    });

    const noPhone = await failure(
      updateVendor(
        ctx,
        dj.id,
        updateVendorSchema.parse({ weddingDayContact: true }),
        new Map(),
      ),
    );
    expect(noPhone.details).toMatchObject({
      fields: { phone: expect.any(String) },
    });

    const contact = await updateVendor(
      ctx,
      dj.id,
      updateVendorSchema.parse({
        weddingDayContact: true,
        phone: "+91 99887 76655",
        bookingStatus: "ADVANCE_PAID",
        quotePaise: null,
        agreedPaise: 35_000_00,
      }),
      new Map(),
    );
    expect(contact).toMatchObject({
      phone: "+919988776655",
      bookingStatus: "ADVANCE_PAID",
      quotePaise: null,
      agreedPaise: 35_000_00,
      weddingDayContact: true,
    });
    // Its phone can't be removed while it's a contact.
    expect(
      (
        await failure(
          updateVendor(
            ctx,
            dj.id,
            updateVendorSchema.parse({ phone: "" }),
            new Map(),
          ),
        )
      ).code,
    ).toBe("VALIDATION_FAILED");

    expect(await weddingDayContacts(ctx)).toEqual([
      { id: dj.id, name: "DJ Ravi", role: "DJ", phone: "+919988776655" },
    ]);
  });
});
