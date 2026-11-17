// How expense categories and statuses read, shared by the expenses service
// (for short labels like "Catering · Haldi") and the screens. The values
// match Database Design's `expenses.category` and `status`.

export const CATEGORY_LABELS = {
  CATERING: "Catering",
  DECOR: "Decor",
  VENUE: "Venue",
  CLOTHING: "Clothing",
  JEWELLERY: "Jewellery",
  TRAVEL: "Travel",
  POOJA: "Pooja",
  PHOTOGRAPHY: "Photography",
  OTHER: "Other",
} as const;

export type ExpenseCategory = keyof typeof CATEGORY_LABELS;

export const EXPENSE_STATUS_LABELS = {
  PAID: { label: "Paid", tone: "success" },
  PENDING: { label: "Pending", tone: "warning" },
} as const;
