// Shared formatting helpers: dates in Asia/Kolkata and INR amounts from integer
// paise (docs/Database Design v1.md).
//
// Calendar dates ("2028-01-28") have no time zone and are shown as written.
// Instants ("2028-01-26T09:00:00+05:30") are shown in Asia/Kolkata, whatever
// the server's or viewer's own time zone.

const TIME_ZONE = "Asia/Kolkata";
const DAY_MS = 24 * 60 * 60 * 1000;

const rupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const rupeesWithPaise = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
});
const oneDecimal = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });

/** 185000000 → "₹18,50,000". Shows paise only when there are some: "₹45,000.50". */
export function formatRupees(paise: number): string {
  const format = paise % 100 === 0 ? rupees : rupeesWithPaise;
  return format.format(paise / 100);
}

/** Compact amount for stat tiles: "₹18.5 L", "₹1.2 Cr"; below a lakh, as formatRupees. */
export function formatRupeesShort(paise: number): string {
  const value = paise / 100;
  if (value >= 1_00_00_000) {
    return `₹${oneDecimal.format(value / 1_00_00_000)} Cr`;
  }
  if (value >= 1_00_000) {
    return `₹${oneDecimal.format(value / 1_00_000)} L`;
  }
  return rupees.format(Math.round(value));
}

const shortDate = new Intl.DateTimeFormat("en-IN", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
  year: "numeric",
});
const longDate = new Intl.DateTimeFormat("en-IN", {
  timeZone: "UTC",
  day: "numeric",
  month: "long",
  year: "numeric",
});
const dayMonth = new Intl.DateTimeFormat("en-IN", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
});

// A calendar date as midnight UTC, so formatting in UTC never shifts the day.
function calendarDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

/** "2028-01-28" → "28 Jan 2028", or "28 January 2028" when long. */
export function formatDate(
  date: string,
  style: "short" | "long" = "short",
): string {
  return (style === "long" ? longDate : shortDate).format(calendarDate(date));
}

const weekdayParts = new Intl.DateTimeFormat("en-IN", {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "short",
});

/** "2028-01-26" → { weekday: "Wed", day: "26", month: "Jan" }, for date blocks. */
export function dateParts(date: string): {
  weekday: string;
  day: string;
  month: string;
} {
  const parts = weekdayParts.formatToParts(calendarDate(date));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return { weekday: part("weekday"), day: part("day"), month: part("month") };
}

/** "2026-11-20" → "20 Nov". */
export function formatDayMonth(date: string): string {
  return dayMonth.format(calendarDate(date));
}

const timeParts = new Intl.DateTimeFormat("en-IN", {
  timeZone: TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});
const kolkataDate = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE });

/** Time of an instant in Asia/Kolkata: "9:00 AM". */
export function formatTime(instant: string): string {
  // ICU versions differ in the space before AM/PM (some use U+202F), which
  // would make server and browser output disagree, so it is always a plain space.
  return timeParts
    .formatToParts(new Date(instant))
    .map((part) => {
      if (part.type === "dayPeriod") return part.value.toUpperCase();
      if (part.type === "literal") return part.value.replace(/\s/g, " ");
      return part.value;
    })
    .join("");
}

/** Calendar date of an instant in Asia/Kolkata: "2028-01-26". */
export function kolkataDateOf(instant: string | Date): string {
  return kolkataDate.format(new Date(instant));
}

/** Today's date in Asia/Kolkata, the date the PRD's "overdue" is judged by. */
export function todayInKolkata(now: Date = new Date()): string {
  return kolkataDateOf(now);
}

/** Whole days from one calendar date to another; negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return Math.round(
    (calendarDate(to).getTime() - calendarDate(from).getTime()) / DAY_MS,
  );
}

/**
 * Due-date label relative to today: "Overdue · 28 Oct", "Due today",
 * "Due tomorrow", "Due in 3 days" (within a week), otherwise "Due 20 Nov".
 */
export function formatDue(dueDate: string, today: string): string {
  const days = daysBetween(today, dueDate);
  if (days < 0) return `Overdue · ${formatDayMonth(dueDate)}`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days <= 7) return `Due in ${days} days`;
  return `Due ${formatDayMonth(dueDate)}`;
}

/**
 * How long ago an instant was: "just now", "5 min ago", "3 h ago",
 * "yesterday", "4 days ago", then the date ("28 Oct 2026").
 */
export function formatTimeAgo(instant: string, now: Date = new Date()): string {
  const minutes = Math.floor((now.getTime() - Date.parse(instant)) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;

  const days = daysBetween(kolkataDateOf(instant), kolkataDateOf(now));
  if (days === 0) return `${Math.floor(minutes / 60)} h ago`;
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return formatDate(kolkataDateOf(instant));
}

/** Storage size: "1.3 GB", "640 MB", "12 KB". Decimal units, as storage providers bill. */
export function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit += 1;
  }
  return `${oneDecimal.format(value)} ${units[unit]}`;
}
