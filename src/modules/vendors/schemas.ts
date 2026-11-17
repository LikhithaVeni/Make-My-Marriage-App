// Zod request schemas for the vendors endpoints (docs/API Design v1.md,
// "Vendors"; fields from the PRD's "Vendors" table and Database Design's
// "vendors"). Money is integer paise; phones are stored in E.164.
import { z } from "zod";

import { parsePhone } from "@/lib/phone";

import { BOOKING_STATUSES } from "./model";

/** Up to ₹10 crore, as for expenses (decision 74). */
const MAX_PAISE = 10_00_00_000_00;

const money = z
  .number({ error: "Enter an amount" })
  .int("Use at most two decimal places")
  .min(0, "Enter an amount of ₹0 or more")
  .max(MAX_PAISE, "That's more than ₹10 crore; check the amount");

export const PHONE_MESSAGE = "Enter a phone number like 98765 43210";

/** As typed; "" clears it. Indian numbers get +91. */
const phone = z
  .string()
  .trim()
  .refine((value) => value === "" || parsePhone(value) !== null, PHONE_MESSAGE)
  .transform((value) => (value === "" ? "" : parsePhone(value)!));

const fields = {
  name: z
    .string()
    .trim()
    .min(1, "Enter the vendor's name")
    .max(80, "Use at most 80 characters"),
  serviceType: z
    .string()
    .trim()
    .min(1, "Enter what they do, e.g. Catering")
    .max(80, "Use at most 80 characters"),
  phone,
  notes: z.string().trim().max(2000, "Use at most 2,000 characters"),
  bookingStatus: z.enum(BOOKING_STATUSES, { error: "Choose a booking status" }),
  /** null clears an amount. */
  quotePaise: money.nullable(),
  agreedPaise: money.nullable(),
  weddingDayContact: z.boolean(),
};

/** POST /vendors (Admin, Manager). Documents arrive with file storage. */
export const createVendorSchema = z.object({
  name: fields.name,
  serviceType: fields.serviceType,
  phone: fields.phone.optional(),
  notes: fields.notes.optional(),
  bookingStatus: fields.bookingStatus.default("ENQUIRED"),
  quotePaise: fields.quotePaise.optional(),
  agreedPaise: fields.agreedPaise.optional(),
  weddingDayContact: fields.weddingDayContact.default(false),
});

/** PATCH /vendors/{id}: any field, sent only when changed. */
export const updateVendorSchema = z
  .object(fields)
  .partial()
  .refine((value) => Object.values(value).some((v) => v !== undefined), {
    message: "Nothing to change",
  });

/** GET /vendors filters (API Design): `serviceType`, `bookingStatus`, `q`. */
export const listVendorsQuerySchema = z.object({
  serviceType: z.string().trim().max(80).optional(),
  bookingStatus: fields.bookingStatus.optional(),
  q: z.string().trim().max(100).optional(),
});

export function parseVendorQuery(params: URLSearchParams) {
  const raw: Record<string, string> = {};
  for (const [key, value] of params) if (value !== "") raw[key] = value;
  return listVendorsQuerySchema.safeParse(raw);
}

/** GET /vendors/find-nearby: `serviceType` and the event whose venue to search near. */
export const findNearbyQuerySchema = z.object({
  serviceType: fields.serviceType,
  eventId: z.string().regex(/^[0-9a-f]{24}$/i, "Choose an event"),
});

export type CreateVendorInput = z.output<typeof createVendorSchema>;
export type UpdateVendorInput = z.output<typeof updateVendorSchema>;
export type VendorQuery = z.output<typeof listVendorsQuerySchema>;
