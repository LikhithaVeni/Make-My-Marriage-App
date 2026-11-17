// Mongoose schema and indexes for vendors (docs/Database Design v1.md,
// "vendors"). Private to the vendors module: other code must not import this
// file.
import type { Model, Mongoose, Types } from "mongoose";

export const BOOKING_STATUSES = [
  "ENQUIRED",
  "QUOTED",
  "BOOKED",
  "ADVANCE_PAID",
  "FULLY_PAID",
  "CANCELLED",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export interface VendorDoc {
  _id: Types.ObjectId;
  weddingId: Types.ObjectId;
  name: string;
  /** "Catering", "Decor", "Photography" … */
  serviceType: string;
  /** E.164. */
  phone?: string;
  notes?: string;
  bookingStatus: BookingStatus;
  quotePaise?: number;
  agreedPaise?: number;
  /** Quotations, contracts and receipts arrive with file storage. */
  documents: {
    key: string;
    name: string;
    type: "QUOTE" | "CONTRACT" | "CONFIRMATION" | "RECEIPT" | "OTHER";
    uploadedAt: Date;
  }[];
  weddingDayContact: boolean;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export function vendorModels(mongoose: Mongoose): { Vendor: Model<VendorDoc> } {
  const existing = mongoose.models.Vendor as Model<VendorDoc> | undefined;
  if (existing) return { Vendor: existing };

  const { Schema } = mongoose;
  const { ObjectId } = Schema.Types;
  const money = {
    type: Number,
    min: 0,
    validate: { validator: Number.isInteger, message: "Whole paise" },
  };
  const schema = new Schema<VendorDoc>(
    {
      weddingId: { type: ObjectId, required: true, ref: "Wedding" },
      name: { type: String, required: true, trim: true, maxlength: 80 },
      serviceType: { type: String, required: true, trim: true, maxlength: 80 },
      phone: String,
      notes: { type: String, maxlength: 2000 },
      bookingStatus: {
        type: String,
        required: true,
        enum: BOOKING_STATUSES,
        default: "ENQUIRED",
      },
      quotePaise: money,
      agreedPaise: money,
      documents: {
        type: [
          {
            key: { type: String, required: true },
            name: { type: String, required: true },
            type: {
              type: String,
              required: true,
              enum: ["QUOTE", "CONTRACT", "CONFIRMATION", "RECEIPT", "OTHER"],
            },
            uploadedAt: { type: Date, required: true },
          },
        ],
        default: [],
      },
      weddingDayContact: { type: Boolean, required: true, default: false },
      createdBy: { type: ObjectId, required: true, ref: "User" },
      updatedBy: { type: ObjectId, required: true, ref: "User" },
    },
    { timestamps: true },
  );
  // Database Design "Indexes": the list by type; wedding-day contacts.
  schema.index({ weddingId: 1, serviceType: 1 });
  schema.index(
    { weddingId: 1, weddingDayContact: 1 },
    { partialFilterExpression: { weddingDayContact: true } },
  );

  return { Vendor: mongoose.model<VendorDoc>("Vendor", schema, "vendors") };
}

/** Builds the indexes declared above, for the setup script (decision 68). */
export async function createVendorIndexes(mongoose: Mongoose): Promise<void> {
  await vendorModels(mongoose).Vendor.createIndexes();
}
