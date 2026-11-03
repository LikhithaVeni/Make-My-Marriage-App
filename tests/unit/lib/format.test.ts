import { describe, expect, it } from "vitest";

import {
  dateParts,
  daysBetween,
  formatBytes,
  formatDate,
  formatDayMonth,
  formatDue,
  formatRupees,
  formatRupeesShort,
  formatTime,
  formatTimeAgo,
  kolkataDateOf,
  todayInKolkata,
} from "@/lib/format";

describe("formatRupees", () => {
  it("groups in lakhs and crores", () => {
    expect(formatRupees(185_000_000)).toBe("₹18,50,000");
    expect(formatRupees(1_234_567_800)).toBe("₹1,23,45,678");
  });

  it("shows paise only when there are some", () => {
    expect(formatRupees(4_500_050)).toBe("₹45,000.50");
    expect(formatRupees(0)).toBe("₹0");
  });
});

describe("formatRupeesShort", () => {
  it("uses lakhs and crores for large amounts", () => {
    expect(formatRupeesShort(185_000_000)).toBe("₹18.5 L");
    expect(formatRupeesShort(10_000_000)).toBe("₹1 L");
    expect(formatRupeesShort(1_200_000_000)).toBe("₹1.2 Cr");
  });

  it("shows smaller amounts in full", () => {
    expect(formatRupeesShort(4_000_000)).toBe("₹40,000");
  });
});

describe("dates", () => {
  it("formats calendar dates as written, in any server time zone", () => {
    expect(formatDate("2028-01-28")).toBe("28 Jan 2028");
    expect(formatDate("2028-01-28", "long")).toBe("28 January 2028");
    expect(formatDayMonth("2026-11-20")).toBe("20 Nov");
  });

  it("splits a date into parts for date blocks", () => {
    expect(dateParts("2028-01-26")).toEqual({
      weekday: "Wed",
      day: "26",
      month: "Jan",
    });
  });

  it("formats times in Asia/Kolkata", () => {
    expect(formatTime("2028-01-26T09:00:00+05:30")).toBe("9:00 AM");
    expect(formatTime("2028-01-27T14:00:00Z")).toBe("7:30 PM");
  });

  it("takes the Kolkata date of an instant, which can differ from UTC", () => {
    // 20:00 UTC on 3 Nov is 01:30 on 4 Nov in Kolkata.
    expect(kolkataDateOf("2026-11-03T20:00:00Z")).toBe("2026-11-04");
    expect(todayInKolkata(new Date("2026-11-03T20:00:00Z"))).toBe("2026-11-04");
  });

  it("counts whole days between calendar dates", () => {
    expect(daysBetween("2026-11-03", "2028-01-28")).toBe(451);
    expect(daysBetween("2026-11-03", "2026-10-28")).toBe(-6);
  });
});

describe("formatDue", () => {
  const today = "2026-11-03";

  it("labels past due dates as overdue", () => {
    expect(formatDue("2026-10-28", today)).toBe("Overdue · 28 Oct");
  });

  it("labels the next week relative to today", () => {
    expect(formatDue("2026-11-03", today)).toBe("Due today");
    expect(formatDue("2026-11-04", today)).toBe("Due tomorrow");
    expect(formatDue("2026-11-10", today)).toBe("Due in 7 days");
  });

  it("shows the date beyond a week", () => {
    expect(formatDue("2026-11-15", today)).toBe("Due 15 Nov");
  });
});

describe("formatTimeAgo", () => {
  const now = new Date("2026-11-03T12:00:00+05:30");

  it("uses minutes and hours for today", () => {
    expect(formatTimeAgo("2026-11-03T11:59:30+05:30", now)).toBe("just now");
    expect(formatTimeAgo("2026-11-03T11:45:00+05:30", now)).toBe("15 min ago");
    expect(formatTimeAgo("2026-11-03T09:00:00+05:30", now)).toBe("3 h ago");
  });

  it("uses Kolkata calendar days for older entries", () => {
    expect(formatTimeAgo("2026-11-02T23:30:00+05:30", now)).toBe("yesterday");
    expect(formatTimeAgo("2026-10-31T09:10:00+05:30", now)).toBe("3 days ago");
    expect(formatTimeAgo("2026-10-20T09:10:00+05:30", now)).toBe("20 Oct 2026");
  });
});

describe("formatBytes", () => {
  it("uses decimal units", () => {
    expect(formatBytes(1_250_000_000)).toBe("1.3 GB");
    expect(formatBytes(640_000_000)).toBe("640 MB");
    expect(formatBytes(512)).toBe("512 B");
  });
});
