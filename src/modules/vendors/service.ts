// Vendors business logic: vendor records, booking status, wedding-day
// contacts and Find nearby links (PRD "Vendors", key flow F4; API Design
// "Vendors"). What each vendor has been paid comes from expenses, which the
// callers combine in (decision 75). Documents arrive with file storage.
// Callers outside this module reach it only through index.ts.
import "server-only";

import type { ClientSession, QueryFilter } from "mongoose";

import { connectDb } from "@/platform/db";
import { AppError } from "@/platform/errors";
import type { WeddingContext } from "@/platform/rbac";

import { type BookingStatus, type VendorDoc, vendorModels } from "./model";
import type {
  CreateVendorInput,
  UpdateVendorInput,
  VendorQuery,
} from "./schemas";

/** A vendor as the API returns it. */
export interface VendorView {
  id: string;
  name: string;
  serviceType: string;
  /** E.164, e.g. "+919876543210". */
  phone: string | null;
  notes: string | null;
  bookingStatus: BookingStatus;
  quotePaise: number | null;
  agreedPaise: number | null;
  /** The Paid expenses linked to this vendor (PRD: "paid vs agreed cost"). */
  paidPaise: number;
  weddingDayContact: boolean;
  createdAt: string;
  updatedAt: string;
}

/** What each vendor has been paid, by vendor id, from expenses. */
export type PaidByVendor = ReadonlyMap<string, number>;

async function models() {
  return vendorModels(await connectDb());
}

const notFound = () =>
  new AppError("NOT_FOUND", 404, "This vendor doesn't exist.");

const validationFailed = (fields: Record<string, string>) =>
  new AppError("VALIDATION_FAILED", 400, "Some fields are invalid.", {
    fields,
  });

const CONTACT_NEEDS_PHONE =
  "Add a phone number to list them as a wedding-day contact";

function isObjectId(id: string): boolean {
  return /^[0-9a-f]{24}$/i.test(id);
}

function toView(vendor: VendorDoc, paid: PaidByVendor): VendorView {
  const id = vendor._id.toString();
  return {
    id,
    name: vendor.name,
    serviceType: vendor.serviceType,
    phone: vendor.phone ?? null,
    notes: vendor.notes ?? null,
    bookingStatus: vendor.bookingStatus,
    quotePaise: vendor.quotePaise ?? null,
    agreedPaise: vendor.agreedPaise ?? null,
    paidPaise: paid.get(id) ?? 0,
    weddingDayContact: vendor.weddingDayContact,
    createdAt: vendor.createdAt.toISOString(),
    updatedAt: vendor.updatedAt.toISOString(),
  };
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * The vendor list (API Design `GET /vendors`): by service type, then name;
 * filters `serviceType`, `bookingStatus` and `q` (name or phone). A wedding
 * has a few dozen vendors, so there's no paging.
 */
export async function listVendors(
  ctx: WeddingContext,
  query: VendorQuery,
  paid: PaidByVendor,
): Promise<VendorView[]> {
  const filter: QueryFilter<VendorDoc> = { weddingId: ctx.weddingId };
  if (query.serviceType) {
    filter.serviceType = {
      $regex: `^${escapeRegExp(query.serviceType)}$`,
      $options: "i",
    };
  }
  if (query.bookingStatus) filter.bookingStatus = query.bookingStatus;
  if (query.q) {
    const text = { $regex: escapeRegExp(query.q), $options: "i" };
    const digits = query.q.replace(/\D/g, "");
    filter.$or = [
      { name: text },
      ...(digits.length >= 3 ? [{ phone: { $regex: digits } }] : []),
    ];
  }
  const { Vendor } = await models();
  const vendors = await Vendor.find(filter).limit(500);
  return vendors
    .map((vendor) => toView(vendor, paid))
    .sort(
      (a, b) =>
        a.serviceType.localeCompare(b.serviceType, "en-IN") ||
        a.name.localeCompare(b.name, "en-IN"),
    );
}

async function findVendor(ctx: WeddingContext, id: string) {
  if (!isObjectId(id)) throw notFound();
  const { Vendor } = await models();
  const vendor = await Vendor.findOne({ _id: id, weddingId: ctx.weddingId });
  if (!vendor) throw notFound();
  return vendor;
}

/** One vendor (API Design `GET /vendors/{id}`). */
export async function getVendor(
  ctx: WeddingContext,
  id: string,
  paid: PaidByVendor,
): Promise<VendorView> {
  return toView(await findVendor(ctx, id), paid);
}

/** Saves a chosen vendor (PRD key flow F4, step 2; Admin, Manager). */
export async function createVendor(
  ctx: WeddingContext,
  input: CreateVendorInput,
): Promise<VendorView> {
  if (input.weddingDayContact && !input.phone) {
    throw validationFailed({ phone: CONTACT_NEEDS_PHONE });
  }
  const { Vendor } = await models();
  const vendor = await Vendor.create({
    weddingId: ctx.weddingId,
    name: input.name,
    serviceType: input.serviceType,
    ...(input.phone && { phone: input.phone }),
    ...(input.notes && { notes: input.notes }),
    bookingStatus: input.bookingStatus,
    ...(input.quotePaise != null && { quotePaise: input.quotePaise }),
    ...(input.agreedPaise != null && { agreedPaise: input.agreedPaise }),
    weddingDayContact: input.weddingDayContact,
    createdBy: ctx.userId,
    updatedBy: ctx.userId,
  });
  return toView(vendor, new Map());
}

/**
 * Edits a vendor or moves its booking status (API Design `PATCH
 * /vendors/{id}`). Only the fields sent are written; "" or null clears an
 * optional one. A wedding-day contact needs a phone.
 */
export async function updateVendor(
  ctx: WeddingContext,
  id: string,
  input: UpdateVendorInput,
  paid: PaidByVendor,
): Promise<VendorView> {
  const current = await findVendor(ctx, id);
  const phone = input.phone === undefined ? current.phone : input.phone;
  const contact = input.weddingDayContact ?? current.weddingDayContact;
  if (contact && !phone) {
    throw validationFailed({ phone: CONTACT_NEEDS_PHONE });
  }

  const set: Record<string, unknown> = { updatedBy: ctx.userId };
  const unset: Record<string, ""> = {};
  for (const field of [
    "name",
    "serviceType",
    "bookingStatus",
    "weddingDayContact",
  ] as const) {
    if (input[field] !== undefined) set[field] = input[field];
  }
  for (const field of ["phone", "notes"] as const) {
    const value = input[field];
    if (value === undefined) continue;
    if (value) set[field] = value;
    else unset[field] = "";
  }
  for (const field of ["quotePaise", "agreedPaise"] as const) {
    const value = input[field];
    if (value === undefined) continue;
    if (value === null) unset[field] = "";
    else set[field] = value;
  }

  const { Vendor } = await models();
  const updated = await Vendor.findOneAndUpdate(
    { _id: current._id, weddingId: ctx.weddingId },
    { $set: set, ...(Object.keys(unset).length && { $unset: unset }) },
    { returnDocument: "after" },
  );
  if (!updated) throw notFound();
  return toView(updated, paid);
}

/**
 * Deletes a vendor (Admin, Manager). Its expenses keep their data without
 * the link, in the same transaction: the route passes expenses' part in
 * (Database Design "What happens on delete"). Documents will be purged once
 * they exist.
 */
export async function deleteVendor(
  ctx: WeddingContext,
  id: string,
  alsoDelete?: (
    deleted: { weddingId: string; vendorId: string },
    session: ClientSession,
  ) => Promise<void>,
): Promise<void> {
  const vendor = await findVendor(ctx, id);
  const mongoose = await connectDb();
  const { Vendor } = vendorModels(mongoose);
  const transaction = await mongoose.startSession();
  try {
    await transaction.withTransaction(async () => {
      await alsoDelete?.(
        { weddingId: ctx.weddingId, vendorId: vendor._id.toString() },
        transaction,
      );
      await Vendor.deleteOne(
        { _id: vendor._id, weddingId: ctx.weddingId },
        { session: transaction },
      );
    });
  } finally {
    await transaction.endSession();
  }
}

/** Every vendor's id and name, for expenses to check and show (decision 75). */
export async function vendorNamesOf(
  ctx: WeddingContext,
): Promise<{ id: string; name: string }[]> {
  const { Vendor } = await models();
  const vendors = await Vendor.find({ weddingId: ctx.weddingId }, { name: 1 })
    .sort({ name: 1 })
    .limit(500);
  return vendors.map((vendor) => ({
    id: vendor._id.toString(),
    name: vendor.name,
  }));
}

export interface WeddingDayContact {
  id: string;
  name: string;
  /** Their service, e.g. "Catering". */
  role: string;
  phone: string;
}

/**
 * Who to call on the day (PRD "Wedding-day contacts", API Design
 * `GET /vendors/contacts`): vendors flagged as wedding-day contacts, by
 * service then name. Organisers join when accounts have phone numbers
 * (decision 75).
 */
export async function weddingDayContacts(
  ctx: WeddingContext,
): Promise<WeddingDayContact[]> {
  const { Vendor } = await models();
  const vendors = await Vendor.find({
    weddingId: ctx.weddingId,
    weddingDayContact: true,
    phone: { $exists: true },
  });
  return vendors
    .map((vendor) => ({
      id: vendor._id.toString(),
      name: vendor.name,
      role: vendor.serviceType,
      phone: vendor.phone!,
    }))
    .sort(
      (a, b) =>
        a.role.localeCompare(b.role, "en-IN") ||
        a.name.localeCompare(b.name, "en-IN"),
    );
}

/** How many vendors the wedding has, for the dashboard. */
export async function vendorCount(ctx: WeddingContext): Promise<number> {
  const { Vendor } = await models();
  return Vendor.countDocuments({ weddingId: ctx.weddingId });
}
