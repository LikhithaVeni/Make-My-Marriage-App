// Mongoose schema and indexes for expenses (docs/Database Design v1.md,
// "expenses"). Private to the expenses module: other code must not import
// this file.
import type { Model, Mongoose, Types } from "mongoose";

export const CATEGORIES = [
  "CATERING",
  "DECOR",
  "VENUE",
  "CLOTHING",
  "JEWELLERY",
  "TRAVEL",
  "POOJA",
  "PHOTOGRAPHY",
  "OTHER",
] as const;
export const EXPENSE_STATUSES = ["PAID", "PENDING"] as const;
export type Category = (typeof CATEGORIES)[number];
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

export interface ExpenseDoc {
  _id: Types.ObjectId;
  weddingId: Types.ObjectId;
  /** Integer paise, more than 0. */
  amountPaise: number;
  /** YYYY-MM-DD, the day it was spent or agreed. */
  date: string;
  /** Required on create; unset only when its event is deleted ("No event"). */
  eventId?: Types.ObjectId;
  taskId?: Types.ObjectId;
  vendorId?: Types.ObjectId;
  category: Category;
  description?: string;
  /** An organiser's name or free text. */
  paidBy: string;
  status: ExpenseStatus;
  /** YYYY-MM-DD; required when Pending. */
  dueDate?: string;
  receiptKey?: string;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export function expenseModels(mongoose: Mongoose): {
  Expense: Model<ExpenseDoc>;
} {
  const existing = mongoose.models.Expense as Model<ExpenseDoc> | undefined;
  if (existing) return { Expense: existing };

  const { Schema } = mongoose;
  const { ObjectId } = Schema.Types;
  const schema = new Schema<ExpenseDoc>(
    {
      weddingId: { type: ObjectId, required: true, ref: "Wedding" },
      amountPaise: {
        type: Number,
        required: true,
        min: 1,
        validate: { validator: Number.isInteger, message: "Whole paise" },
      },
      date: { type: String, required: true },
      eventId: { type: ObjectId, ref: "Event" },
      taskId: { type: ObjectId, ref: "Task" },
      vendorId: { type: ObjectId, ref: "Vendor" },
      category: { type: String, required: true, enum: CATEGORIES },
      description: { type: String, maxlength: 2000 },
      paidBy: { type: String, required: true, trim: true, maxlength: 80 },
      status: { type: String, required: true, enum: EXPENSE_STATUSES },
      dueDate: String,
      receiptKey: String,
      createdBy: { type: ObjectId, required: true, ref: "User" },
      updatedBy: { type: ObjectId, required: true, ref: "User" },
    },
    { timestamps: true },
  );
  // Database Design "Field rules": dueDate is required when Pending.
  schema.pre("validate", function () {
    if (this.status === "PENDING" && !this.dueDate) {
      this.invalidate("dueDate", "Choose when it's due");
    }
  });
  // Database Design "Indexes": by event and totals; pending payments; paid
  // vs agreed per vendor.
  schema.index({ weddingId: 1, eventId: 1, date: -1 });
  schema.index({ weddingId: 1, status: 1, dueDate: 1 });
  schema.index({ weddingId: 1, vendorId: 1 }, { sparse: true });

  return {
    Expense: mongoose.model<ExpenseDoc>("Expense", schema, "expenses"),
  };
}

/** Builds the indexes declared above, for the setup script (decision 68). */
export async function createExpenseIndexes(mongoose: Mongoose): Promise<void> {
  await expenseModels(mongoose).Expense.createIndexes();
}
