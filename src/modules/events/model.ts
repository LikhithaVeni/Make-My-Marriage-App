// Mongoose schema and indexes for events (docs/Database Design v1.md,
// "events"). Private to the events module: other code must not import this
// file.
import type { Model, Mongoose, Types } from "mongoose";

export interface EventDoc {
  _id: Types.ObjectId;
  weddingId: Types.ObjectId;
  /** "Haldi", "Pelli". */
  name: string;
  startAt: Date;
  /** After startAt; may be the next day (late-night muhurthams). */
  endAt: Date;
  muhurthamAt?: Date;
  /** mapUrl is stored only when an organiser gave one (decision 70). */
  venue: { name: string; address: string; mapUrl?: string };
  dressCode?: string;
  instructions?: string;
  coverKey?: string;
  /** A youtube.com or youtu.be URL. */
  livestreamUrl?: string;
  proDeliveryUrl?: string;
  /** Random and unique; the event's QR upload link (Gallery). */
  uploadToken: string;
  /** Orders events that start at the same moment: the earlier-added first. */
  sortOrder: number;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export function eventModels(mongoose: Mongoose): { Event: Model<EventDoc> } {
  const { Schema } = mongoose;
  const { ObjectId } = Schema.Types;

  const existing = mongoose.models.Event as Model<EventDoc> | undefined;
  if (existing) return { Event: existing };

  const schema = new Schema<EventDoc>(
    {
      weddingId: { type: ObjectId, required: true, ref: "Wedding" },
      name: { type: String, required: true, trim: true, maxlength: 80 },
      startAt: { type: Date, required: true },
      endAt: { type: Date, required: true },
      muhurthamAt: Date,
      venue: {
        name: { type: String, required: true, trim: true, maxlength: 200 },
        address: { type: String, required: true, trim: true, maxlength: 500 },
        mapUrl: String,
      },
      dressCode: { type: String, maxlength: 200 },
      instructions: { type: String, maxlength: 2000 },
      coverKey: String,
      livestreamUrl: String,
      proDeliveryUrl: String,
      uploadToken: { type: String, required: true, unique: true },
      sortOrder: { type: Number, required: true, default: 0 },
      createdBy: { type: ObjectId, required: true, ref: "User" },
      updatedBy: { type: ObjectId, required: true, ref: "User" },
    },
    { timestamps: true },
  );
  // Database Design "Field rules": events.endAt > startAt. The service checks
  // it first with a field message; this guards every save.
  schema.pre("validate", function () {
    if (this.startAt && this.endAt && this.endAt <= this.startAt) {
      this.invalidate("endAt", "The end must be after the start");
    }
  });
  // Database Design "Indexes": the schedule and upcoming events.
  schema.index({ weddingId: 1, startAt: 1 });

  return { Event: mongoose.model<EventDoc>("Event", schema, "events") };
}

/** Builds the indexes declared above, for the setup script (decision 68). */
export async function createEventIndexes(mongoose: Mongoose): Promise<void> {
  await eventModels(mongoose).Event.createIndexes();
}
