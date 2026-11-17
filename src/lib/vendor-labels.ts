import type { BadgeTone } from "@/components/ui/Badge";

// How vendors' booking statuses read, and the service types offered while
// typing (others are fine), shared by the vendors service and the screens.

export const BOOKING_STATUS_LABELS: Record<
  string,
  { label: string; tone: BadgeTone }
> = {
  ENQUIRED: { label: "Enquired", tone: "neutral" },
  QUOTED: { label: "Quoted", tone: "neutral" },
  BOOKED: { label: "Booked", tone: "accent" },
  ADVANCE_PAID: { label: "Advance paid", tone: "warning" },
  FULLY_PAID: { label: "Fully paid", tone: "success" },
  CANCELLED: { label: "Cancelled", tone: "danger" },
};

/** PRD order: Enquired → Quoted → Booked → Advance paid → Fully paid. */
export const BOOKING_STATUS_ORDER = [
  "ENQUIRED",
  "QUOTED",
  "BOOKED",
  "ADVANCE_PAID",
  "FULLY_PAID",
  "CANCELLED",
] as const;

/** Common wedding services, for suggestions and Find nearby. */
export const SERVICE_TYPES = [
  "Catering",
  "Decor",
  "Venue",
  "Photography",
  "Videography",
  "Mehendi artist",
  "Makeup artist",
  "DJ",
  "Band",
  "Pandit",
  "Florist",
  "Tent house",
  "Lighting",
  "Clothing",
  "Jewellery",
  "Invitation cards",
  "Transport",
  "Return gifts",
] as const;
